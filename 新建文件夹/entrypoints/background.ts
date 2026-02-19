// 任务调度中心 (Service Worker)
// 核心目的：管理扩展的生命周期，调度音频处理任务，处理跨页面通讯

import type {
  Message,
  ContentToBackgroundMessage,
  BackgroundToOffscreenMessage,
  OffscreenToBackgroundMessage,
  BackgroundToUIMessage,
  StatusMessage,
  ErrorMessage
} from '../shared/messages';

export default {
  main() {
    console.log('SonicSense AI Background Service Worker loaded');

    let offscreenReady = false;
    let pendingMessages: BackgroundToOffscreenMessage[] = [];

    // 创建 offscreen document
    const ensureOffscreenDocument = async () => {
      try {
        const clients = await self.clients.matchAll({ type: 'all' });
        const offscreenClient = clients.find(client => 
          client.url.includes('offscreen.html')
        );
        
        if (!offscreenClient) {
          await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: '需要处理音频流和运行 AudioWorklet'
          });
          console.log('Offscreen document created');
        } else {
          console.log('Offscreen document already exists');
        }
        offscreenReady = true;
        
        // 发送待处理消息
        for (const msg of pendingMessages) {
          chrome.runtime.sendMessage(msg).catch(console.error);
        }
        pendingMessages = [];
      } catch (error) {
        console.error('Failed to create offscreen document:', error);
        offscreenReady = false;
      }
    };

    // 初始化 offscreen document
    ensureOffscreenDocument();

    // 监听来自 content script、popup 和 options 的消息
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        console.log('Background received message:', message, 'from:', sender.id);

        const handleMessage = async () => {
          try {
            switch (message.type) {
              // 从 Content 来的消息
              case 'audio_stream':
              case 'audio_stream_started':
              case 'audio_stream_stopped':
                // 转发到 offscreen
                if (offscreenReady) {
                  await chrome.runtime.sendMessage(message as BackgroundToOffscreenMessage);
                } else {
                  pendingMessages.push(message as BackgroundToOffscreenMessage);
                  await ensureOffscreenDocument();
                }
                break;

              // 从 Offscreen 来的消息
              case 'audio_processed':
              case 'voice_print':
              case 'audio_analysis':
              case 'play_status':
              case 'noise_reduction_status':
              case 'voice_print_calibration_result':
              case 'status':
              case 'error':
                // 这些消息已经由 offscreen 发送，background 只需要记录
                console.log('Offscreen status:', message);
                break;

              // 从 UI (popup/options) 来的控制消息
              case 'play_control':
              case 'noise_reduction_config':
              case 'settings_update':
              case 'voice_print_calibration':
                // 转发到 offscreen
                if (offscreenReady) {
                  await chrome.runtime.sendMessage(message as BackgroundToOffscreenMessage);
                } else {
                  pendingMessages.push(message as BackgroundToOffscreenMessage);
                  await ensureOffscreenDocument();
                }
                break;
            }
            
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: (error as Error).message });
          }
        };

        handleMessage();
        return true; // 保持消息通道开放用于异步响应
      }
    );

    // 监听 offscreen document 卸载
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'offscreen') {
        port.onDisconnect.addListener(() => {
          console.log('Offscreen document disconnected');
          offscreenReady = false;
        });
      }
    });

    // 扩展安装/更新时的处理
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        // 首次安装，打开欢迎页面或 options 页面
        chrome.runtime.openOptionsPage();
      }
    });

    // 定期发送心跳状态
    setInterval(() => {
      const statusMessage: StatusMessage = {
        type: 'status',
        status: offscreenReady ? 'idle' : 'error',
        details: offscreenReady ? '服务正常运行' : '等待 offscreen 初始化'
      };
      // 不发送，避免干扰 UI
    }, 30000);

    console.log('Background Service Worker initialized');
  }
};
