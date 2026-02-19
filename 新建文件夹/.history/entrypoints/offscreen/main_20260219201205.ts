// 音频处理心脏主脚本
// 核心目的：加载 AI 模型，运行 AudioWorklet，进行实时音频处理

import { defineOffscreen } from 'wxt';
import type { Message } from '../../shared/messages';

export default defineOffscreen(() => {
  console.log('SonicSense AI Offscreen Document loaded');

  let audioContext: AudioContext | null = null;
  let audioWorkletNode: AudioWorkletNode | null = null;

  // 初始化 AudioContext
  const initAudioContext = async () => {
    if (!audioContext) {
      audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule(chrome.runtime.getURL('assets/audio-worklet.ts'));
      console.log('AudioWorklet loaded successfully');
    }
  };

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener(async (message: Message) => {
    console.log('Offscreen received message:', message);

    switch (message.type) {
      case 'audio_stream':
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
        break;
      case 'process_audio':
        // 处理音频数据
        if (audioWorkletNode) {
          // TODO: 发送参数到 AudioWorklet
        }
        break;
    }
  });

  // TODO: 实现 AI 模型加载与 AudioWorklet 逻辑
});