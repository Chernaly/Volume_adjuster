// 音频处理心脏主脚本
// 核心目的：加载 AI 模型，运行 AudioWorklet，进行实时音频处理

import { pipeline } from '@xenova/transformers';
import type {
  Message,
  AudioStreamMessage,
  ProcessAudioMessage,
  PlayControlMessage,
  NoiseReductionConfig,
  SettingsUpdateMessage,
  VoicePrintCalibrationRequest,
  AudioAnalysisMessage,
  VoicePrintMessage,
  PlayStatusMessage,
  NoiseReductionStatus,
  VoicePrintCalibrationResult,
  StatusMessage,
  ErrorMessage,
  DEFAULT_SETTINGS
} from '../../shared/messages';

export default {
  main() {
    console.log('SonicSense AI Offscreen Document loaded');

    let audioContext: AudioContext | null = null;
    let audioWorkletNode: AudioWorkletNode | null = null;
    let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    let voiceActivityDetector: any = null; // AI 模型实例
    let isProcessing = false;
    let currentStreamId: string | null = null;

    // 设置状态
    let settings = {
      targetRMS: 0.1,
      gain: 1.0,
      noiseReductionEnabled: true,
      voicePrintEnabled: true
    };

    // 声纹校准相关
    let isCalibrating = false;
    let calibrationStartTime = 0;
    let calibrationDuration = 5000; // 5 秒
    const MAX_VOICE_PRINT_SAMPLES = 200; // 环形缓冲区上限
    let voicePrintSamples: number[][] = [];

    // 消息节流：每 100ms 批量发送分析数据
    let pendingAudioAnalysis: AudioAnalysisMessage[] = [];
    let pendingVoicePrint: VoicePrintMessage[] = [];
    let throttleTimer: NodeJS.Timeout | null = null;

    const scheduleThrottleFlush = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        flushPendingMessages();
      }, 100);
    };

    const flushPendingMessages = () => {
      throttleTimer = null;

      if (pendingAudioAnalysis.length > 0) {
        // 取最新一条（或可聚合，此处取最后一条以降低延迟）
        const latest = pendingAudioAnalysis[pendingAudioAnalysis.length - 1];
        chrome.runtime.sendMessage(latest).catch(console.error);
        pendingAudioAnalysis = [];
      }

      if (pendingVoicePrint.length > 0) {
        // 同样取最新一条
        const latest = pendingVoicePrint[pendingVoicePrint.length - 1];
        chrome.runtime.sendMessage(latest).catch(console.error);
        pendingVoicePrint = [];
      }
    };

    // 加载 AI 模型（懒加载：仅在 init_audio_context 后触发）
    let modelLoaded = false;
    const loadAIModel = async () => {
      if (modelLoaded) return;
      try {
        console.log('Loading AI model...');
        // 使用语音活动检测模型
        voiceActivityDetector = await pipeline(
          'audio-classification',
          'Xenova/speechbrain-google_speech_command_vad'
        );
        modelLoaded = true;
        console.log('AI model loaded successfully');

        // 发送状态更新
        sendStatus('idle', 'AI 模型加载完成');
      } catch (error) {
        console.error('Failed to load AI model:', error);
        sendError('MODEL_LOAD_FAILED', 'AI 模型加载失败', error);
      }
    };

    // 发送状态消息（不节流）
    const sendStatus = (status: 'idle' | 'processing' | 'error' | 'calibrating', details?: string) => {
      const message: StatusMessage = {
        type: 'status',
        status,
        details
      };
      chrome.runtime.sendMessage(message).catch(console.error);
    };

    // 发送错误消息（不节流）
    const sendError = (code: string, message: string, details?: any) => {
      const error: ErrorMessage = {
        type: 'error',
        code,
        message,
        details
      };
      chrome.runtime.sendMessage(error).catch(console.error);
    };

    // 发送音频分析数据（节流）
    const sendAudioAnalysis = (data: AudioAnalysisMessage) => {
      pendingAudioAnalysis.push(data);
      scheduleThrottleFlush();
    };

    // 发送声纹数据（节流）
    const sendVoicePrint = (data: VoicePrintMessage) => {
      pendingVoicePrint.push(data);
      scheduleThrottleFlush();
    };

    // 发送播放状态（不节流）
    const sendPlayStatus = (isPlaying: boolean, isPaused = false) => {
      const message: PlayStatusMessage = {
        type: 'play_status',
        isPlaying,
        isPaused,
        streamId: currentStreamId || undefined
      };
      chrome.runtime.sendMessage(message).catch(console.error);
    };

    // 发送降噪状态（不节流）
    const sendNoiseReductionStatus = () => {
      const message: NoiseReductionStatus = {
        type: 'noise_reduction_status',
        enabled: settings.noiseReductionEnabled,
        noiseProfileLearned: false // TODO: 实现噪声谱学习状态跟踪
      };
      chrome.runtime.sendMessage(message).catch(console.error);
    };

    // 发送声纹校准结果（不节流）
    const sendCalibrationResult = (success: boolean, voicePrint?: number[], error?: string) => {
      const message: VoicePrintCalibrationResult = {
        type: 'voice_print_calibration_result',
        success,
        voicePrint,
        error
      };
      chrome.runtime.sendMessage(message).catch(console.error);
    };

    // 初始化 AudioContext
    const initAudioContext = async () => {
      if (!audioContext) {
        try {
          audioContext = new AudioContext({
            sampleRate: 44100,
            latencyHint: 'interactive'
          });
          console.log('AudioContext created (initial state:', audioContext.state, ')');

          // 加载 AudioWorklet
          const workletUrl = chrome.runtime.getURL('assets/audio-worklet.ts');
          await audioContext.audioWorklet.addModule(workletUrl);
          console.log('AudioWorklet loaded successfully');

          // 创建 AudioWorkletNode
          audioWorkletNode = new AudioWorkletNode(audioContext, 'sonic-sense-processor');

          // 设置 AudioWorklet 参数
          audioWorkletNode.port.postMessage({
            type: 'setTargetRMS',
            value: settings.targetRMS
          });

          audioWorkletNode.port.postMessage({
            type: 'setGain',
            value: settings.gain
          });

          audioWorkletNode.port.postMessage({
            type: 'setNoiseReduction',
            value: {
              enabled: settings.noiseReductionEnabled
            }
          });

          audioWorkletNode.port.postMessage({
            type: 'setVoicePrint',
            value: {
              enabled: settings.voicePrintEnabled
            }
          });

          // 监听 AudioWorklet 消息
          audioWorkletNode.port.onmessage = handleWorkletMessage;

          return true;
        } catch (error) {
          console.error('Failed to initialize AudioContext or load AudioWorklet:', error);
          sendError('AUDIO_INIT_FAILED', '音频上下文初始化失败', error);
          throw error;
        }
      }

      // 如果已存在但处于 suspended 状态，尝试恢复
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('AudioContext resumed (now in state:', audioContext.state, ')');
          return true;
        } catch (error) {
          console.error('Failed to resume AudioContext:', error);
          sendError('AUDIO_RESUME_FAILED', '音频上下文恢复失败', error);
          throw error;
        }
      }

      return true;
    };

    // 处理初始化请求（必须由用户交互触发）
    const handleInitAudioContext = async () => {
      try {
        await initAudioContext();
        // 懒加载 AI 模型
        await loadAIModel();
        sendStatus('idle', '音频上下文已初始化，AI 模型已加载');
      } catch (error) {
        sendError('INIT_AUDIO_CONTEXT_FAILED', '初始化音频上下文失败', error);
      }
    };

    // 处理 AudioWorklet 消息
    const handleWorkletMessage = (event: MessageEvent) => {
      const data = event.data;

      if (!data) return;

      switch (data.type) {
        case 'audioAnalysis':
          sendAudioAnalysis({
            type: 'audio_analysis',
            rms: data.rms,
            spectrum: data.spectrum,
            gain: data.gain,
            timestamp: Date.now()
          });
          break;

        case 'voicePrint':
          // 如果正在校准，收集样本（环形缓冲区）
          if (isCalibrating) {
            voicePrintSamples.push(data.mfcc);
            if (voicePrintSamples.length > MAX_VOICE_PRINT_SAMPLES) {
              voicePrintSamples.shift(); // 移除最旧样本
            }

            const elapsed = Date.now() - calibrationStartTime;
            if (elapsed >= calibrationDuration) {
              // 校准完成，计算平均声纹
              isCalibrating = false;
              const avgVoicePrint = calculateAverageVoicePrint(voicePrintSamples);
              sendCalibrationResult(true, avgVoicePrint);
              sendStatus('idle', '声纹校准完成');
              voicePrintSamples = [];
            }
          }

          // 发送声纹数据（节流）
          sendVoicePrint({
            type: 'voice_print',
            streamId: currentStreamId || '',
            mfcc: data.mfcc,
            pitch: data.pitch,
            energyBands: data.energyBands,
            rms: data.rms,
            timestamp: Date.now()
          });
          break;
      }
    };

    // 计算平均声纹
    const calculateAverageVoicePrint = (samples: number[][]): number[] => {
      if (samples.length === 0) return [];

      const result = new Array(13).fill(0);
      for (const sample of samples) {
        for (let i = 0; i < 13 && i < sample.length; i++) {
          result[i] += sample[i];
        }
      }
      return result.map(v => v / samples.length);
    };

    // 开始音频处理
    const startProcessing = async (stream: MediaStream, streamId: string) => {
      try {
        await initAudioContext();

        if (!audioContext || !audioWorkletNode) {
          throw new Error('Audio context not initialized');
        }

        // 停止之前的流
        if (mediaStreamSource) {
          mediaStreamSource.disconnect();
        }

        // 创建新的 MediaStreamAudioSourceNode
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        // 连接音频处理链
        mediaStreamSource.connect(audioWorkletNode);
        // 注意：不连接到 destination，避免音频输出造成回环

        isProcessing = true;
        currentStreamId = streamId;

        console.log('Audio processing pipeline established for stream:', streamId);
        sendStatus('processing', '音频处理已启动');
        sendPlayStatus(true);

      } catch (error) {
        console.error('Failed to establish audio processing pipeline:', error);
        sendError('PROCESSING_START_FAILED', '音频处理启动失败', error);
      }
    };

    // 停止音频处理
    const stopProcessing = () => {
      if (mediaStreamSource) {
        mediaStreamSource.disconnect();
        mediaStreamSource = null;
      }

      isProcessing = false;
      currentStreamId = null;

      console.log('Audio processing stopped');
      sendStatus('idle', '音频处理已停止');
      sendPlayStatus(false);
    };

    // 开始声纹校准
    const startCalibration = (duration: number) => {
      if (!isProcessing) {
        sendCalibrationResult(false, undefined, '请先开始音频处理');
        return;
      }

      isCalibrating = true;
      calibrationStartTime = Date.now();
      calibrationDuration = duration * 1000;
      voicePrintSamples = [];

      console.log('Starting voice print calibration for', duration, 'seconds');
      sendStatus('calibrating', `声纹校准中... (${duration}秒)`);
    };

    // 更新设置
    const updateSettings = (newSettings: Partial<typeof settings>) => {
      settings = { ...settings, ...newSettings };

      if (audioWorkletNode) {
        if (newSettings.targetRMS !== undefined) {
          audioWorkletNode.port.postMessage({
            type: 'setTargetRMS',
            value: newSettings.targetRMS
          });
        }

        if (newSettings.gain !== undefined) {
          audioWorkletNode.port.postMessage({
            type: 'setGain',
            value: newSettings.gain
          });
        }

        if (newSettings.noiseReductionEnabled !== undefined) {
          audioWorkletNode.port.postMessage({
            type: 'setNoiseReduction',
            value: {
              enabled: newSettings.noiseReductionEnabled
            }
          });
        }

        if (newSettings.voicePrintEnabled !== undefined) {
          audioWorkletNode.port.postMessage({
            type: 'setVoicePrint',
            value: {
              enabled: newSettings.voicePrintEnabled
            }
          });
        }
      }

      console.log('Settings updated:', settings);
      sendNoiseReductionStatus();
    };

    // 初始化（不立即加载模型，等待用户交互）
    // loadAIModel(); // 移除，改为懒加载

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener(async (message: Message) => {
      console.log('Offscreen received message:', message);

      switch (message.type) {
        case 'init_audio_context':
          handleInitAudioContext();
          break;

        case 'audio_stream':
          const audioStreamMsg = message as AudioStreamMessage;
          await startProcessing(audioStreamMsg.data, audioStreamMsg.streamId);
          break;

        case 'play_control':
          const playCtrlMsg = message as PlayControlMessage;
          switch (playCtrlMsg.action) {
            case 'start':
              console.log('Play start requested');
              break;
            case 'stop':
              stopProcessing();
              break;
            case 'pause':
              if (audioContext) {
                audioContext.suspend();
                sendPlayStatus(isProcessing, true);
              }
              break;
            case 'resume':
              if (audioContext) {
                audioContext.resume();
                sendPlayStatus(isProcessing, false);
              }
              break;
          }
          break;

        case 'noise_reduction_config':
          const noiseCfgMsg = message as NoiseReductionConfig;
          updateSettings({
            noiseReductionEnabled: noiseCfgMsg.enabled
          });
          break;

        case 'settings_update':
          const settingsMsg = message as SettingsUpdateMessage;
          updateSettings(settingsMsg.settings);
          break;

        case 'voice_print_calibration':
          const calibMsg = message as VoicePrintCalibrationRequest;
          startCalibration(calibMsg.duration);
          break;
      }
    });

    // 清理
    self.addEventListener('unload', () => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
      if (audioContext) {
        audioContext.close();
      }
      console.log('Offscreen document unloaded');
    });
  }
};