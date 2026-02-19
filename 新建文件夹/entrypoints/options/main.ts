// 设置页主脚本
// 核心目的：允许用户进行声纹校准和标准人声录入

import type {
  Message,
  VoicePrintCalibrationResult,
  StatusMessage,
  AudioAnalysisMessage,
  VoicePrintMessage,
  SettingsUpdateMessage,
  NoiseReductionConfig
} from '../../shared/messages';

console.log('SonicSense AI Options loaded');

// 应用状态
interface OptionsState {
  // 音频设置
  targetRMS: number;
  gain: number;
  noiseReductionEnabled: boolean;
  voicePrintEnabled: boolean;
  noiseThreshold: number;
  
  // 声纹校准
  isCalibrating: boolean;
  calibrationProgress: number;
  voicePrintData: number[] | null;
  calibrationStatus: 'idle' | 'success' | 'error';
  statusMessage: string;
  
  // 音频可视化
  audioLevels: number[];
}

const defaultState: OptionsState = {
  targetRMS: 0.1,
  gain: 1.0,
  noiseReductionEnabled: true,
  voicePrintEnabled: true,
  noiseThreshold: 0.02,
  isCalibrating: false,
  calibrationProgress: 0,
  voicePrintData: null,
  calibrationStatus: 'idle',
  statusMessage: '',
  audioLevels: new Array(32).fill(0)
};

let state: OptionsState = { ...defaultState };

// 发送消息到 background
function sendMessage(message: Message): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// 渲染页面
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = `
    <div class="options-page">
      <header class="page-header">
        <h1>⚙️ SonicSense AI 设置</h1>
        <p>声纹校准、音频处理参数配置</p>
      </header>
      
      <!-- 音频处理设置 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">🎛️</span>
          音频处理参数
        </h2>
        <p class="section-description">
          调整音频处理的核心参数，包括目标响度、增益和降噪设置。
        </p>
        
        <div class="form-group">
          <label class="form-label">目标 RMS (Root Mean Square)</label>
          <input type="range" class="form-range" 
                 min="0.01" max="0.5" step="0.01" 
                 value="${state.targetRMS}"
                 data-setting="targetRMS">
          <div class="form-range-value">当前值：${state.targetRMS.toFixed(2)}</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">基础增益</label>
          <input type="range" class="form-range" 
                 min="0" max="2" step="0.1" 
                 value="${state.gain}"
                 data-setting="gain">
          <div class="form-range-value">当前值：${(state.gain * 100).toFixed(0)}%</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">噪声阈值</label>
          <input type="range" class="form-range" 
                 min="0.001" max="0.1" step="0.001" 
                 value="${state.noiseThreshold}"
                 data-setting="noiseThreshold">
          <div class="form-range-value">当前值：${state.noiseThreshold.toFixed(3)}</div>
        </div>
        
        <div class="toggles">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">降噪处理</div>
              <div class="toggle-description">使用谱减法进行实时降噪</div>
            </div>
            <label class="switch">
              <input type="checkbox" data-toggle="noiseReduction" ${state.noiseReductionEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">声纹特征提取</div>
              <div class="toggle-description">实时分析并提取声纹特征</div>
            </div>
            <label class="switch">
              <input type="checkbox" data-toggle="voicePrint" ${state.voicePrintEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="section-footer">
          <button class="btn btn-secondary" data-action="reset-audio-settings">
            恢复默认设置
          </button>
          <button class="btn btn-primary" data-action="save-audio-settings">
            保存设置
          </button>
        </div>
      </section>
      
      <!-- 声纹校准 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">🎤</span>
          声纹校准
        </h2>
        <p class="section-description">
          通过录制您的声音样本，系统将学习并提取您的声纹特征，用于后续的个性化音频处理。
        </p>
        
        <div class="btn-group">
          <button class="btn btn-primary" data-action="start-calibration" 
                  ${state.isCalibrating ? 'disabled' : ''}>
            ${state.isCalibrating ? '🔄 校准中...' : '🎙️ 开始校准'}
          </button>
          <button class="btn btn-secondary" data-action="cancel-calibration" 
                  ${!state.isCalibrating ? 'disabled' : ''}>
            取消校准
          </button>
        </div>
        
        ${state.isCalibrating ? `
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${state.calibrationProgress}%"></div>
            </div>
            <div class="progress-text">校准进度：${state.calibrationProgress}%</div>
          </div>
        ` : ''}
        
        ${state.voicePrintData ? `
          <div class="voice-print-display" title="声纹特征图谱">
            ${state.voicePrintData.map((value, i) => `
              <div class="voice-print-bar" 
                   style="height: ${Math.min(100, (value + 10) * 5)}%"
                   title="MFCC ${i}: ${value.toFixed(2)}"></div>
            `).join('')}
          </div>
        ` : ''}
        
        ${state.statusMessage ? `
          <div class="status-message ${state.calibrationStatus}">
            ${state.statusMessage}
          </div>
        ` : ''}
      </section>
      
      <!-- 标准人声录入 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">📝</span>
          标准人声录入
        </h2>
        <p class="section-description">
          录制一段标准人声样本，用于后续的音频质量对比和参考。
        </p>
        
        <div class="btn-group">
          <button class="btn btn-primary" data-action="start-recording">
            🎙️ 开始录制
          </button>
          <button class="btn btn-secondary" data-action="stop-recording" disabled>
            ⏹️ 停止录制
          </button>
          <button class="btn btn-success" data-action="save-recording" disabled>
            💾 保存样本
          </button>
        </div>
        
        <div class="audio-viz-container">
          ${state.audioLevels.map((level, i) => `
            <div class="audio-viz-bar" 
                 style="height: ${Math.max(5, level * 100)}%"></div>
          `).join('')}
        </div>
        
        <div class="section-footer">
          <button class="btn btn-secondary" data-action="clear-recording">
            清除样本
          </button>
        </div>
      </section>
      
      <!-- 关于 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">ℹ️</span>
          关于 SonicSense AI
        </h2>
        <p class="section-description">
          SonicSense AI 是一个基于 AI 的浏览器扩展，实现实时声纹特征提取、
          动态增益补偿与人声分离功能。
        </p>
        <div style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
          <p>版本：v0.1.0</p>
          <p>技术栈：WXT + Transformers.js + Web Audio API</p>
        </div>
      </section>
    </div>
  `;
  
  attachEventListeners();
}

// 附加事件监听器
function attachEventListeners() {
  // 设置滑块
  const ranges = document.querySelectorAll<HTMLInputElement>('.form-range');
  ranges.forEach(range => {
    range.addEventListener('input', (e) => {
      const setting = (e.target as HTMLInputElement).dataset.setting;
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (setting && state.hasOwnProperty(setting)) {
        (state as any)[setting] = value;
        render();
      }
    });
  });
  
  // 开关
  const toggles = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const action = (e.target as HTMLInputElement).dataset.toggle;
      const checked = (e.target as HTMLInputElement).checked;
      switch (action) {
        case 'noiseReduction':
          state.noiseReductionEnabled = checked;
          break;
        case 'voicePrint':
          state.voicePrintEnabled = checked;
          break;
      }
      render();
    });
  });
  
  // 按钮
  const buttons = document.querySelectorAll<HTMLButtonElement>('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleAction(action);
    });
  });
}

// 处理按钮操作
async function handleAction(action: string | undefined) {
  if (!action) return;
  
  switch (action) {
    case 'save-audio-settings':
      await saveAudioSettings();
      break;
    case 'reset-audio-settings':
      resetAudioSettings();
      break;
    case 'start-calibration':
      await startCalibration();
      break;
    case 'cancel-calibration':
      cancelCalibration();
      break;
    case 'start-recording':
      startRecording();
      break;
    case 'stop-recording':
      stopRecording();
      break;
    case 'save-recording':
      saveRecording();
      break;
    case 'clear-recording':
      clearRecording();
      break;
  }
}

// 保存音频设置
async function saveAudioSettings() {
  try {
    await sendMessage({
      type: 'settings_update',
      settings: {
        targetRMS: state.targetRMS,
        gain: state.gain,
        noiseReductionEnabled: state.noiseReductionEnabled,
        voicePrintEnabled: state.voicePrintEnabled
      }
    });
    
    await sendMessage({
      type: 'noise_reduction_config',
      enabled: state.noiseReductionEnabled,
      threshold: state.noiseThreshold
    });
    
    state.statusMessage = '设置已保存';
    state.calibrationStatus = 'success';
    render();
    
    setTimeout(() => {
      state.statusMessage = '';
      render();
    }, 3000);
  } catch (error) {
    state.statusMessage = '保存设置失败：' + (error as Error).message;
    state.calibrationStatus = 'error';
    render();
  }
}

// 恢复默认音频设置
function resetAudioSettings() {
  state.targetRMS = defaultState.targetRMS;
  state.gain = defaultState.gain;
  state.noiseThreshold = defaultState.noiseThreshold;
  state.noiseReductionEnabled = defaultState.noiseReductionEnabled;
  state.voicePrintEnabled = defaultState.voicePrintEnabled;
  render();
}

// 开始声纹校准
async function startCalibration() {
  try {
    state.isCalibrating = true;
    state.calibrationProgress = 0;
    state.statusMessage = '正在校准，请朗读一段文字...';
    state.calibrationStatus = 'idle';
    render();
    
    // 发送校准请求到 offscreen
    await sendMessage({
      type: 'voice_print_calibration',
      duration: 5
    });
    
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      state.calibrationProgress = Math.min(100, state.calibrationProgress + 5);
      render();
      
      if (state.calibrationProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 250);
    
  } catch (error) {
    state.isCalibrating = false;
    state.statusMessage = '校准失败：' + (error as Error).message;
    state.calibrationStatus = 'error';
    render();
  }
}

// 取消校准
function cancelCalibration() {
  state.isCalibrating = false;
  state.calibrationProgress = 0;
  state.statusMessage = '校准已取消';
  state.calibrationStatus = 'idle';
  render();
}

// 开始录制
function startRecording() {
  state.statusMessage = '正在录制...';
  render();
  
  // 模拟音频可视化
  simulateAudioVisualization();
}

// 停止录制
function stopRecording() {
  state.statusMessage = '录制完成，可以保存样本';
  render();
}

// 保存录制
function saveRecording() {
  state.statusMessage = '样本已保存';
  state.calibrationStatus = 'success';
  render();
  
  setTimeout(() => {
    state.statusMessage = '';
    render();
  }, 3000);
}

// 清除录制
function clearRecording() {
  state.audioLevels = new Array(32).fill(0);
  state.statusMessage = '';
  render();
}

// 模拟音频可视化
function simulateAudioVisualization() {
  const interval = setInterval(() => {
    if (!state.isCalibrating && state.statusMessage !== '正在录制...') {
      return;
    }
    
    state.audioLevels = state.audioLevels.map(() => Math.random() * 0.8 + 0.1);
    render();
  }, 100);
  
  setTimeout(() => {
    clearInterval(interval);
  }, 5000);
}

// 处理消息
function handleMessage(message: Message) {
  console.log('Options received message:', message);
  
  switch (message.type) {
    case 'voice_print_calibration_result':
      const result = message as VoicePrintCalibrationResult;
      state.isCalibrating = false;
      state.calibrationProgress = 100;
      
      if (result.success) {
        state.voicePrintData = result.voicePrint || [];
        state.statusMessage = '声纹校准成功！';
        state.calibrationStatus = 'success';
      } else {
        state.statusMessage = '校准失败：' + (result.error || '未知错误');
        state.calibrationStatus = 'error';
      }
      render();
      break;
      
    case 'status':
      const statusMsg = message as StatusMessage;
      if (statusMsg.status === 'calibrating') {
        state.isCalibrating = true;
        state.statusMessage = statusMsg.details || '正在校准...';
        render();
      }
      break;
      
    case 'audio_analysis':
      const analysisMsg = message as AudioAnalysisMessage;
      // 更新音频可视化
      if (analysisMsg.spectrum) {
        state.audioLevels = analysisMsg.spectrum.slice(0, 32);
        render();
      }
      break;
      
    case 'voice_print':
      const voicePrintMsg = message as VoicePrintMessage;
      // 更新声纹显示
      if (voicePrintMsg.mfcc) {
        state.voicePrintData = voicePrintMsg.mfcc;
        render();
      }
      break;
  }
}

// 初始化
function init() {
  console.log('SonicSense AI Options initialized');
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 请求当前设置
  sendMessage({ type: 'settings_update', settings: {} })
    .catch(() => {});
  
  // 初始渲染
  render();
}

init();
