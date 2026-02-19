// 交互面板主脚本
// 核心目的：提供用户界面，显示音量条、状态，并控制音频处理

import { VolumeBar } from '../../components/VolumeBar';

console.log('SonicSense AI Popup loaded');

let currentGain = 0;

function updateUI() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <h1>SonicSense AI</h1>
      <p>实时声纹特征提取与人声分离</p>
      ${VolumeBar({ value: currentGain, onChange: (value) => { currentGain = value; updateUI(); } })}
      <button id="toggle-processing">开始处理</button>
    `;

    // 添加事件监听
    const toggleButton = document.getElementById('toggle-processing');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        console.log('Toggle processing');
        // TODO: 发送消息到 background 切换处理状态
      });
    }
  }
}

updateUI();