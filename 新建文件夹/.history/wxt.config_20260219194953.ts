import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'SonicSense AI',
    description: '利用 AI 实现浏览器端的实时声纹特征提取、动态增益补偿与人声分离',
    version: '1.0.0',
    manifest_version: 3,
    permissions: [
      'tabCapture',
      'offscreen',
      'storage',
      'activeTab',
      'scripting'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.ts'],
        run_at: 'document_start'
      }
    ],
    action: {
      default_title: 'SonicSense AI',
      default_popup: 'popup.html'
    },
    options_page: 'options.html',
    background: {
      service_worker: 'background.ts'
    },
    web_accessible_resources: [
      {
        resources: ['*'],
        matches: ['<all_urls>']
      }
    ]
  }
});