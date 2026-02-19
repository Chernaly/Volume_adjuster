// 页面劫持 (DOM 注入与音频流捕获)
// 核心目的：检测页面中的视频元素，捕获音频流并传输至 Offscreen Document

import { defineContentScript } from 'wxt';
import type { AudioStreamMessage } from '../shared/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('SonicSense AI Content Script injected');

    // 检测页面中的视频元素
    const videos = document.querySelectorAll('video');
    console.log(`Found ${videos.length} video elements`);

    videos.forEach((video, index) => {
      console.log(`Video ${index}:`, video.src || 'No src');

      // 监听视频播放事件
      video.addEventListener('play', () => {
        console.log(`Video ${index} started playing`);

        // 尝试捕获音频流
        if (video.captureStream) {
          try {
            const stream = video.captureStream();
            console.log(`Captured stream for video ${index}:`, stream);

            // 发送音频流到 background
            const message: AudioStreamMessage = {
              type: 'audio_stream',
              streamId: `video_${index}_${Date.now()}`,
              data: stream
            };

            chrome.runtime.sendMessage(message).catch(error => {
              console.error('Failed to send audio stream:', error);
            });
          } catch (error) {
            console.error(`Failed to capture stream for video ${index}:`, error);
          }
        }
      });
    });
  },
});