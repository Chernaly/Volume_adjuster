// 页面劫持 (DOM 注入与音频流捕获)
// 核心目的：检测页面中的视频元素，捕获音频流并传输至 Offscreen Document

import { defineContentScript } from 'wxt';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('SonicSense AI Content Script injected');

    // 检测页面中的视频元素
    const videos = document.querySelectorAll('video');
    console.log(`Found ${videos.length} video elements`);

    videos.forEach((video, index) => {
      console.log(`Video ${index}:`, video.src || 'No src');

      // TODO: 实现音频流捕获逻辑
      // 检查是否可以捕获流
      if (video.captureStream) {
        try {
          const stream = video.captureStream();
          console.log(`Captured stream for video ${index}:`, stream);
          // TODO: 传输至 Offscreen Document
        } catch (error) {
          console.error(`Failed to capture stream for video ${index}:`, error);
        }
      }
    });
  },
});