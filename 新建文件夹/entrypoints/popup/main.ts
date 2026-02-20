// 交互面板主脚本
// 核心目的：提供用户界面，显示音量条、状态，并控制音频处理

import { renderPopup } from '../../components/VolumeBar';
import type {
  AudioAnalysisMessage,
  VoicePrintMessage,
  PlayStatusMessage,
  StatusMessage,
  ErrorMessage,
  NoiseReductionStatus,
  Message
} from '../../shared/messages';

console.log('SonicSense AI Popup loaded');

// 应用状态
interface AppState {
  status: 'idle' | 'processing' | 'error' | 'calibrating';
  rms: number;
  pitch: number;
  gain: number;
  volumeLevel: number;
  targetRMS: number;
  noiseReductionEnabled: boolean;
  voicePrintEnabled: boolean;
  isPlaying: boolean;
}

const state: AppState = {
  status: 'idle',
  rms: 0,
  pitch: 0,
  gain: 1,
  volumeLevel: 0,
  targetRMS: 0.1,
  noiseReductionEnabled: true,
  voicePrintEnabled: true,
  isPlaying: false
};

// 平滑音量级别
let smoothedVolumeLevel = 0;

// 渲染 UI
function render() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = renderPopup(state);
    attachEventListeners();
  }
}

// 平滑更新音量级别
function updateVolumeLevel(rms: number) {
  // RMS 转换为 0-100 的级别
  const targetLevel = Math.min(100, (rms / 0.3) * 100);
  // 平滑过渡
  smoothedVolumeLevel = smoothedVolumeLevel * 0.7 + targetLevel * 0.3;
  state.volumeLevel = smoothedVolumeLevel;
}

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

// 初始化 AudioContext（必须由用户交互触发）
async function initAudioContext() {
  try {
    await sendMessage({ type: 'init_audio_context' });
    console.log('Sent init_audio_context request');
  } catch (error) {
    console.error('Failed to init audio context:', error);
  }
}

// 开始/停止处理
async function toggleProcessing() {
  if (state.status === 'processing') {
    await sendMessage({ type: 'play_control', action: 'stop' });
  } else {
    // 先初始化 AudioContext（用户交互上下文）
    await initAudioContext();
    // 再请求开始处理
    await sendMessage({ type: 'play_control', action: 'start' });
  }
}

// 打开设置页面
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// 开始声纹校准
async function startCalibration() {
  await sendMessage({
    type: 'voice_print_calibration',
    duration: 5
  });
}

// 更新增益设置
async function updateGain(value: number) {
  // 将 dB 转换为线性增益
  const linearGain = Math.pow(10, value / 20);
  state.gain = linearGain;
  
  await sendMessage({
    type: 'settings_update',
    settings: {
      gain: linearGain
    }
  });
  
  render();
}

// 切换降噪设置
async function toggleNoiseReduction(checked: boolean) {
  state.noiseReductionEnabled = checked;
  
  await sendMessage({
    type: 'noise_reduction_config',
    enabled: checked
  });
  
  render();
}

// 切换声纹提取设置
async function toggleVoicePrint(checked: boolean) {
  state.voicePrintEnabled = checked;
  
  await sendMessage({
    type: 'settings_update',
    settings: {
      voicePrintEnabled: checked
    }
  });
  
  render();
}

// 附加事件监听器
function attachEventListeners() {
  // 音量滑块
  const volumeSlider = document.querySelector<HTMLInputElement>('.volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      updateGain(value);
    });
  }
  
  // 控制按钮
  const controlBtns = document.querySelectorAll<HTMLButtonElement>('.control-btn');
  controlBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'start':
        case 'stop':
          toggleProcessing();
          break;
        case 'calibrate':
          startCalibration();
          break;
        case 'open-settings':
          openSettings();
          break;
      }
    });
  });
  
  // 开关
  const toggles = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const action = (e.target as HTMLInputElement).dataset.action;
      const checked = (e.target as HTMLInputElement).checked;
      switch (action) {
        case 'noise-reduction':
          toggleNoiseReduction(checked);
          break;
        case 'voice-print':
          toggleVoicePrint(checked);
          break;
      }
    });
  });
}

// 处理消息
function handleMessage(message: Message) {
  console.log('Popup received message:', message);
  
  switch (message.type) {
    case 'audio_analysis':
      const analysisMsg = message as AudioAnalysisMessage;
      state.rms = analysisMsg.rms;
      state.gain = analysisMsg.gain;
      updateVolumeLevel(analysisMsg.rms);
      break;
      
    case 'voice_print':
      const voicePrintMsg = message as VoicePrintMessage;
      state.pitch = voicePrintMsg.pitch;
      state.rms = voicePrintMsg.rms;
      updateVolumeLevel(voicePrintMsg.rms);
      break;
      
    case 'play_status':
      const playStatusMsg = message as PlayStatusMessage;
      state.isPlaying = playStatusMsg.isPlaying;
      state.status = playStatusMsg.isPlaying ? 'processing' : 'idle';
      break;
      
    case 'status':
      const statusMsg = message as StatusMessage;
      state.status = statusMsg.status;
      break;
      
    case 'error':
      const errorMsg = message as ErrorMessage;
      console.error('Popup received error:', errorMsg);
      state.status = 'error';
      break;
      
    case 'noise_reduction_status':
      const noiseStatusMsg = message as NoiseReductionStatus;
      state.noiseReductionEnabled = noiseStatusMsg.enabled;
      break;
  }
  
  render();
}

// 初始化
function init() {
  console.log('SonicSense AI Popup initialized');
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 请求当前状态
  sendMessage({ type: 'settings_update', settings: {} })
    .catch(() => {}); // 忽略错误
  
  // 初始渲染
  render();
}

init();
