// 页面劫持 (DOM 注入与音频流捕获)
// 核心目的：检测页面中的视频元素，捕获音频流并传输至 Offscreen Document

export default {
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

        // 检查 CORS 权限
        try {
          // 检查视频是否可访问
          if (video.crossOrigin === 'anonymous' || video.crossOrigin === null) {
            console.warn(`Video ${index} may have CORS restrictions`);
          }

          // 尝试捕获音频流
          if (video.captureStream) {
            const stream = video.captureStream();
            console.log(`Captured stream for video ${index}:`, stream);

            // 验证流包含音频轨道
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
              console.warn(`No audio tracks found in stream for video ${index}`);
              return;
            }

            // 发送音频流到 background
            const message: AudioStreamMessage = {
              type: 'audio_stream',
              streamId: `video_${index}_${Date.now()}`,
              data: stream
            };

            chrome.runtime.sendMessage(message).catch(error => {
              console.error('Failed to send audio stream:', error);
            });
          } else {
            console.warn(`captureStream not supported for video ${index}`);
          }
        } catch (error) {
          console.error(`Error processing video ${index}:`, error);
          // 处理常见异常：CORS, 权限被拒绝等
          if (error instanceof DOMException) {
            switch (error.name) {
              case 'NotAllowedError':
                console.error('Permission denied for video capture');
                break;
              case 'SecurityError':
                console.error('CORS or security restriction');
                break;
              default:
                console.error('DOM exception:', error.message);
            }
          }
        }
      });
    });
  },
};