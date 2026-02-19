// 音频处理心脏主脚本
// 核心目的：加载 AI 模型，运行 AudioWorklet，进行实时音频处理

import { pipeline } from '@xenova/transformers';
import type { Message } from '../../shared/messages';

export default {
  main() {
    console.log('SonicSense AI Offscreen Document loaded');

    let audioContext: AudioContext | null = null;
    let audioWorkletNode: AudioWorkletNode | null = null;
    let voiceActivityDetector: any = null;

    // 加载 AI 模型
    const loadAIModel = async () => {
      try {
        console.log('Loading AI model...');
        // 使用语音活动检测模型作为示例
        voiceActivityDetector = await pipeline('audio-classification', 'Xenova/speechbrain-google_speech_command_vad');
        console.log('AI model loaded successfully');
      } catch (error) {
        console.error('Failed to load AI model:', error);
      }
    };

    // 初始化
    loadAIModel();

    // 初始化 AudioContext
    const initAudioContext = async () => {
      if (!audioContext) {
        try {
          audioContext = new AudioContext();
          await audioContext.audioWorklet.addModule(chrome.runtime.getURL('assets/audio-worklet.ts'));
          console.log('AudioWorklet loaded successfully');
        } catch (error) {
          console.error('Failed to initialize AudioContext or load AudioWorklet:', error);
          throw error;
        }
      }
    };

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener(async (message: Message) => {
      console.log('Offscreen received message:', message);

      switch (message.type) {
        case 'audio_stream':
          try {
            await initAudioContext();
            if (audioContext && message.data) {
              // 创建 MediaStreamAudioSourceNode
              const source = audioContext.createMediaStreamSource(message.data);
              // 创建 AudioWorkletNode
              audioWorkletNode = new AudioWorkletNode(audioContext, 'sonic-sense-processor');
              // 连接节点
              source.connect(audioWorkletNode);
              audioWorkletNode.connect(audioContext.destination);
              console.log('Audio processing pipeline established');
            }
          } catch (error) {
            console.error('Failed to establish audio processing pipeline:', error);
          }
          break;
        case 'process_audio':
          // 处理音频数据
          if (audioWorkletNode) {
            // 发送增益参数到 AudioWorklet
            audioWorkletNode.port.postMessage({
              type: 'setGain',
              value: message.audioData ? 1.0 : 0.5 // 示例值
            });
          }
          break;
      }
    });

    // TODO: 实现 AI 模型加载与 AudioWorklet 逻辑
  }
};