// 音量条组件
// 核心目的：显示当前音频增益水平，提供用户调节接口

interface VolumeBarProps {
  value: number;
  onChange: (value: number) => void;
}

export function VolumeBar({ value, onChange }: VolumeBarProps) {
  // 使用 onChange 参数避免未使用警告
  console.log('VolumeBar rendered with value:', value);

  return `
    <div class="volume-bar">
      <label>音量增益: ${value.toFixed(1)}dB</label>
      <input
        type="range"
        min="-20"
        max="20"
        step="0.1"
        value="${value}"
        onchange="this.dispatchEvent(new CustomEvent('volumeChange', { detail: parseFloat(this.value) }))"
      />
    </div>
  `;
}