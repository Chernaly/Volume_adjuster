// 页面劫持 (DOM 注入与音频流捕获)
// 核心目的：检测页面中的视频/音频元素，捕获音频流并传输至 Offscreen Document

import type {
  AudioStreamMessage,
  AudioStreamStartedMessage,
  AudioStreamStoppedMessage
} from '../shared/messages';

interface CapturedStream {
  streamId: string;
  stream: MediaStream;
  element: HTMLVideoElement | HTMLAudioElement;
}

export default {
  matches: ['<all_urls>'],
  main() {
    console.log('SonicSense AI Content Script injected');

    const capturedStreams = new Map<string, CapturedStream>();

    // 检测并处理媒体元素
    const processMediaElement = (
      element: HTMLVideoElement | HTMLAudioElement,
      index: number
    ) => {
      const elementInfo = {
        tag: element.tagName,
        src: element.src || (element as HTMLVideoElement).srcObject ? 'MediaStream' : 'No src',
        crossOrigin: element.crossOrigin,
        hasControls: element.controls,
        isPlaying: !element.paused
      };
      console.log(`Media element ${index}:`, elementInfo);

      // 监听播放事件
      element.addEventListener('play', () => {
        console.log(`Media element ${index} started playing`);
        captureAudioStream(element, index);
      });

      // 监听暂停事件
      element.addEventListener('pause', () => {
        console.log(`Media element ${index} paused`);
      });

      // 监听停止事件
      element.addEventListener('ended', () => {
        console.log(`Media element ${index} ended`);
        stopCaptureForElement(element);
      });

      // 如果已经在播放，立即尝试捕获
      if (!element.paused) {
        captureAudioStream(element, index);
      }
    };

    // 捕获音频流
    const captureAudioStream = (
      element: HTMLVideoElement | HTMLAudioElement,
      index: number
    ) => {
      // 检查是否已经捕获
      for (const [streamId, captured] of capturedStreams) {
        if (captured.element === element) {
          console.log(`Stream already captured for element ${index}: ${streamId}`);
          return;
        }
      }

      // 检查 CORS 权限
      if (element.crossOrigin === 'use-credentials') {
        console.warn(`Media element ${index} has restrictive CORS settings, audio capture may fail`);
      }

      try {
        // 尝试捕获音频流
        if ('captureStream' in element && typeof (element as any).captureStream === 'function') {
          const stream: MediaStream = (element as any).captureStream();
          console.log(`Captured stream for media element ${index}:`, stream);

          // 验证流包含音频轨道
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            console.warn(`No audio tracks found in stream for media element ${index}`);
            // 继续，因为有些浏览器可能在初始时没有音频轨道
          } else {
            console.log(`Found ${audioTracks.length} audio track(s)`);
          }

          // 生成流 ID
          const streamId = `media_${index}_${Date.now()}`;

          // 存储捕获的流
          capturedStreams.set(streamId, {
            streamId,
            stream,
            element
          });

          // 发送音频流到 background
          const message: AudioStreamMessage = {
            type: 'audio_stream',
            streamId,
            data: stream
          };

          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Failed to send audio stream:', chrome.runtime.lastError);
              capturedStreams.delete(streamId);
            } else {
              console.log('Audio stream sent successfully:', streamId);

              // 发送流开始消息
              const startedMessage: AudioStreamStartedMessage = {
                type: 'audio_stream_started',
                streamId,
                timestamp: Date.now()
              };
              chrome.runtime.sendMessage(startedMessage).catch(console.error);
            }
          });
        } else {
          console.warn(`captureStream not supported for media element ${index}`);
          fallbackCaptureStream(element, index);
        }
      } catch (error) {
        console.error(`Error capturing audio stream for media element ${index}:`, error);

        // 处理常见异常
        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotAllowedError':
              console.error('Permission denied for media capture');
              break;
            case 'SecurityError':
              console.error('CORS or security restriction prevents capture');
              break;
            case 'NotSupportedError':
              console.error('Media capture not supported for this element');
              break;
            default:
              console.error('DOM exception:', error.message);
          }
        }
        fallbackCaptureStream(element, index);
      }
    };

    // 停止捕获指定元素的流
    const stopCaptureForElement = (element: HTMLVideoElement | HTMLAudioElement) => {
      for (const [streamId, captured] of capturedStreams) {
        if (captured.element === element) {
          // 停止流的所有轨道
          captured.stream.getTracks().forEach(track => track.stop());

          // 发送流停止消息
          const message: AudioStreamStoppedMessage = {
            type: 'audio_stream_stopped',
            streamId,
            timestamp: Date.now()
          };
          chrome.runtime.sendMessage(message).catch(console.error);

          // 从映射中删除
          capturedStreams.delete(streamId);
          console.log(`Stopped capture for stream: ${streamId}`);
          break;
        }
      }
    };

    // Fallback: 当 captureStream 失败时，发送 fallback 消息（不创建真实流，由 offscreen 处理）
    const fallbackCaptureStream = (
      element: HTMLVideoElement | HTMLAudioElement,
      index: number
    ) => {
      const streamId = `fallback_${index}_${Date.now()}`;
      const fallbackMessage = {
        type: 'audio_stream_fallback',
        streamId,
        elementTag: element.tagName,
        src: element.src || 'dynamic',
        timestamp: Date.now()
      };

      chrome.runtime.sendMessage(fallbackMessage, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send fallback message:', chrome.runtime.lastError);
        } else {
          console.log('Fallback message sent:', streamId);
          // 仅记录，不存储真实流（避免空流问题）
          capturedStreams.set(streamId, {
            streamId,
            stream: new MediaStream(), // 空流占位
            element
          });
        }
      });
    };

    // 扫描页面中的媒体元素
    const scanMediaElements = () => {
      const videos = document.querySelectorAll('video');
      const audios = document.querySelectorAll('audio');

      console.log(`Found ${videos.length} video elements and ${audios.length} audio elements`);

      videos.forEach((video, index) => {
        processMediaElement(video, index);
      });

      audios.forEach((audio, index) => {
        processMediaElement(audio, index + videos.length);
      });
    };

    // 初始扫描
    scanMediaElements();

    // 使用 MutationObserver 监听动态添加的媒体元素
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLMediaElement) {
              shouldRescan = true;
              break;
            }
          }
        }
      }

      if (shouldRescan) {
        // 延迟扫描以确保元素完全初始化
        setTimeout(scanMediaElements, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 定期重新扫描（处理某些 SPA 应用）
    const scanInterval = setInterval(scanMediaElements, 5000);

    // 清理：卸载时清除定时器和 observer
    self.addEventListener('unload', () => {
      clearInterval(scanInterval);
      observer.disconnect();
      console.log('Content script unloaded, cleanup done');
    });

    console.log('Content Script ready, monitoring for media elements');
  },
};