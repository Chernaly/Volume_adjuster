// 页面劫持 (DOM 注入与音频流捕获)
// 核心目的：检测页面中的视频元素，捕获音频流并传输至 Offscreen Document

import { defineContentScript } from 'wxt';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('SonicSense AI Content Script injected');

    // TODO: 实现音频流捕获逻辑
  },
});