// 音频处理心脏主脚本
// 核心目的：加载 AI 模型，运行 AudioWorklet，进行实时音频处理

import { defineOffscreen } from 'wxt';

export default defineOffscreen(() => {
  console.log('SonicSense AI Offscreen Document loaded');

  // 初始化 AudioContext
  const audioContext = new AudioContext();

  // 加载 AudioWorklet
  audioContext.audioWorklet.addModule(chrome.runtime.getURL('assets/audio-worklet.ts'))
    .then(() => {
      console.log('AudioWorklet loaded successfully');
      // TODO: 创建 AudioWorkletNode 并连接到音频流
    })
    .catch(error => {
      console.error('Failed to load AudioWorklet:', error);
    });

  // TODO: 实现 AI 模型加载与 AudioWorklet 逻辑
});