// 任务调度中心 (Service Worker)
// 核心目的：管理扩展的生命周期，调度音频处理任务，处理跨页面通讯

import { defineBackground } from 'wxt';
import type { Message } from '../shared/messages';

export default defineBackground(() => {
  console.log('SonicSense AI Background Service Worker loaded');

  // 监听来自 content script 和 popup 的消息
  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.type) {
      case 'audio_stream':
        // 转发音频流到 offscreen document
        chrome.runtime.sendMessage(message).catch(console.error);
        break;
      case 'process_audio':
        // 处理音频处理请求
        chrome.runtime.sendMessage(message).catch(console.error);
        break;
      case 'audio_processed':
        // 转发处理结果
        chrome.runtime.sendMessage(message).catch(console.error);
        break;
    }

    sendResponse({ success: true });
  });

  // 创建 offscreen document 如果需要
  chrome.offscreen?.createDocument?.({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: '需要处理音频流'
  }).catch(() => {
    // Offscreen document 可能已经存在
  });
});