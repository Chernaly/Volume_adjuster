// 音量条组件
// 核心目的：显示当前音频增益水平，提供用户调节接口

interface VolumeBarProps {
  value: number;
  onChange: (value: number) => void;
}

export function VolumeBar({ value, onChange }: VolumeBarProps) {
  return `
    <div class="volume-bar-container">
      <label class="volume-label">增益调节：${value.toFixed(1)} dB</label>
      <input
        type="range"
        class="volume-slider"
        min="-20"
        max="20"
        step="0.5"
        value="${value}"
        data-action="volume-change"
      />
      <div class="volume-values">
        <span>-20</span>
        <span>0</span>
        <span>+20</span>
      </div>
    </div>
  `;
}

// 音量表组件 - 显示实时音量水平
interface VolumeMeterProps {
  level: number; // 0-100
}

export function VolumeMeter({ level }: VolumeMeterProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const segments = 10;
  const activeSegments = Math.floor(clampedLevel / 10);
  
  let segmentsHtml = '';
  for (let i = segments - 1; i >= 0; i--) {
    const isActive = i < activeSegments;
    const levelClass = i < 3 ? 'low' : i < 6 ? 'medium' : 'high';
    segmentsHtml += `<div class="volume-segment ${isActive ? 'active ' + levelClass : ''}"></div>`;
  }
  
  return `
    <div class="volume-meter">
      ${segmentsHtml}
    </div>
  `;
}

// 状态指示器组件
interface StatusIndicatorProps {
  status: 'idle' | 'processing' | 'error' | 'calibrating';
  text?: string;
}

export function StatusIndicator({ status, text = '' }: StatusIndicatorProps) {
  const statusText = {
    idle: '待机',
    processing: '处理中',
    error: '错误',
    calibrating: '校准中'
  };
  
  return `
    <div class="status-indicator ${status}">
      <div class="status-dot"></div>
      <span class="status-text">${text || statusText[status]}</span>
    </div>
  `;
}

// 音频信息卡片组件
interface AudioInfoCardProps {
  rms: number;
  pitch: number;
  gain: number;
}

export function AudioInfoCard({ rms, pitch, gain }: AudioInfoCardProps) {
  return `
    <div class="audio-info-card">
      <div class="info-item">
        <span class="info-label">RMS</span>
        <span class="info-value">${rms.toFixed(4)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">音高</span>
        <span class="info-value">${pitch > 0 ? pitch.toFixed(1) + ' Hz' : '--'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">增益</span>
        <span class="info-value">${(gain * 100).toFixed(0)}%</span>
      </div>
    </div>
  `;
}

// 控制按钮组件
interface ControlButtonProps {
  action: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  active?: boolean;
}

export function ControlButton({ action, label, icon = '', disabled = false, active = false }: ControlButtonProps) {
  const classes = ['control-btn', action];
  if (disabled) classes.push('disabled');
  if (active) classes.push('active');
  
  return `
    <button class="${classes.join(' ')}" data-action="${action}" ${disabled ? 'disabled' : ''}>
      ${icon ? `<span class="btn-icon">${icon}</span>` : ''}
      <span class="btn-label">${label}</span>
    </button>
  `;
}

// 开关组件
interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
}

export function ToggleSwitch({ id, label, checked }: ToggleSwitchProps) {
  return `
    <div class="toggle-switch">
      <label class="toggle-label">${label}</label>
      <label class="switch">
        <input type="checkbox" data-action="${id}" ${checked ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  `;
}

// 主界面渲染
interface PopupState {
  status: 'idle' | 'processing' | 'error' | 'calibrating';
  rms: number;
  pitch: number;
  gain: number;
  volumeLevel: number;
  targetRMS: number;
  noiseReductionEnabled: boolean;
  voicePrintEnabled: boolean;
}

const defaultState: PopupState = {
  status: 'idle',
  rms: 0,
  pitch: 0,
  gain: 1,
  volumeLevel: 0,
  targetRMS: 0.1,
  noiseReductionEnabled: true,
  voicePrintEnabled: true
};

export function renderPopup(state: PopupState = defaultState): string {
  return `
    <div class="sonic-sense-popup">
      <header class="popup-header">
        <h1>🎵 SonicSense AI</h1>
        <p class="subtitle">实时声纹特征提取与人声分离</p>
      </header>
      
      <main class="popup-main">
        <!-- 状态显示区域 -->
        <section class="status-section">
          ${StatusIndicator({ status: state.status })}
        </section>
        
        <!-- 音量表区域 -->
        <section class="volume-meter-section">
          ${VolumeMeter({ level: state.volumeLevel })}
        </section>
        
        <!-- 音频信息卡片 -->
        <section class="info-section">
          ${AudioInfoCard({ rms: state.rms, pitch: state.pitch, gain: state.gain })}
        </section>
        
        <!-- 增益控制 -->
        <section class="control-section">
          ${VolumeBar({ value: state.gain > 0 ? 20 * Math.log10(state.gain) : -20, onChange: () => {} })}
        </section>
        
        <!-- 设置开关 -->
        <section class="settings-section">
          ${ToggleSwitch({ id: 'noise-reduction', label: '降噪', checked: state.noiseReductionEnabled })}
          ${ToggleSwitch({ id: 'voice-print', label: '声纹提取', checked: state.voicePrintEnabled })}
        </section>
        
        <!-- 控制按钮 -->
        <section class="actions-section">
          ${ControlButton({ 
            action: state.status === 'processing' ? 'stop' : 'start', 
            label: state.status === 'processing' ? '停止处理' : '开始处理',
            icon: state.status === 'processing' ? '⏹' : '▶'
          })}
          ${ControlButton({ 
            action: 'calibrate', 
            label: '声纹校准',
            icon: '🎤',
            disabled: state.status !== 'processing'
          })}
          <button class="control-btn settings" data-action="open-settings">
            <span class="btn-icon">⚙</span>
            <span class="btn-label">设置</span>
          </button>
        </section>
      </main>
      
      <footer class="popup-footer">
        <span>v0.1.0</span>
      </footer>
    </div>
  `;
}
