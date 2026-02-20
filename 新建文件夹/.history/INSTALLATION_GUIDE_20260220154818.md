# SonicSense AI 浏览器扩展安装与测试指南

## 📋 目录
1. [构建扩展](#1-构建扩展)
2. [在 Chrome 中加载扩展](#2-在-chrome-中加载扩展)
3. [功能测试步骤](#3-功能测试步骤)
4. [本地测试页面](#4-本地测试页面)
5. [功能验证清单](#5-功能验证清单)
6. [常见问题排查](#6-常见问题排查)
7. [性能监控](#7-性能监控)
8. [测试报告模板](#8-测试报告模板)

---

## 1. 构建扩展

### 1.1 安装依赖
```bash
npm install
```

### 1.2 构建扩展
```bash

npm run build
```
- 构建输出位于 `.output/chrome-mv3/` 目录
- 总大小约 706 KB
- 包含所有必要的文件：manifest.json, background.js, offscreen.html, popup.html, options.html, content.js 等

> 💡 **注意**：如果遇到 `Failed to create offscreen document` 错误，请检查 `entrypoints/background.ts` 文件中的 `reasons` 参数，确保只使用有效的值（如 `USER_MEDIA`，不要使用 `AUDIO_PROCESSING`）。

## 2. 在 Chrome 中加载扩展

### 2.1 启用开发者模式
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **开发者模式**

### 2.2 加载已解压的扩展
1. 点击 **加载已解压的扩展程序**
2. 选择 `.output/chrome-mv3/` 目录
3. 等待扩展加载完成

### 2.3 验证扩展加载
- 扩展图标应出现在 Chrome 工具栏
- 点击图标打开 Popup 界面
- 检查控制台是否有错误（按 F12 → Console）

## 3. 功能测试步骤

### 3.1 Popup 界面测试
1. 点击扩展图标打开 Popup
2. 验证显示：
   - ✅ 状态指示器（应显示 "待机"）
   - ✅ 音量表（10段可视化）
   - ✅ 音频信息卡片（RMS、音高、增益）
   - ✅ 增益调节滑块（-20dB 到 +20dB）
   - ✅ 降噪/声纹开关（默认开启）
   - ✅ 控制按钮（开始处理、声纹校准、设置）

### 3.2 音频处理测试
1. 打开一个包含视频的网页（如 YouTube、Bilibili）
2. 点击 Popup 中的 **开始处理** 按钮
3. 在网页中播放视频
4. 观察：
   - 状态指示器变为 "处理中"
   - 音量表显示实时音量变化
   - 音频信息卡片显示 RMS 和增益值变化
   - 控制台应有音频流捕获日志

### 3.3 增益调节测试
1. 在 Popup 中拖动增益滑块
2. 观察：
   - 增益值实时更新（dB 显示）
   - 音频信息卡片中的增益百分比变化
   - AudioWorklet 中的总增益计算（targetRMS / currentRMS * userGain）

### 3.4 降噪功能测试
1. 在 Popup 中关闭 **降噪** 开关
2. 播放有背景噪音的视频
3. 观察音频信息卡片中的 RMS 值变化
4. 重新开启降噪，比较 RMS 值差异

### 3.5 声纹校准测试
1. 确保正在处理音频流
2. 点击 Popup 中的 **声纹校准** 按钮
3. 说话 5 秒钟（校准期间）
4. 观察：
   - 状态指示器变为 "校准中"
   - 进度条显示校准进度
   - 校准完成后状态变回 "处理中"
   - 控制台显示声纹特征提取结果

## 4. 本地测试页面

### 4.1 使用 test.html
项目根目录包含 `test.html` 文件，用于本地测试：

1. 打开 `test.html` 文件
2. 点击页面中的 **播放测试音频** 按钮
3. 观察 Popup 界面的实时响应
4. 测试不同音量级别的音频处理效果

### 4.2 测试内容
- 5 秒测试音频（人声+背景音乐）
- 音频格式：MP3/WAV
- 支持自动播放（无需用户交互）

## 5. 功能验证清单

| 功能 | 测试步骤 | 预期结果 | 状态 |
|------|----------|----------|------|
| ✅ 扩展加载 | 加载 .output/chrome-mv3/ | 无错误，图标显示 | |
| ✅ Popup 显示 | 点击扩展图标 | 显示完整 UI 界面 | |
| ✅ 音频捕获 | 播放视频 | 控制台显示 "Captured stream" | |
| ✅ 增益补偿 | 调节增益滑块 | RMS 值稳定，输出音量变化 | |
| ✅ 降噪处理 | 开关降噪功能 | 背景噪音减少，RMS 值降低 | |
| ✅ 声纹提取 | 运行声纹校准 | 提取 MFCC 特征，显示声纹图谱 | |
| ✅ 消息通信 | 各组件间消息传递 | 无通信错误，数据同步 | |
| ✅ 状态管理 | 处理状态切换 | 状态指示器正确显示 | |
| ✅ 错误处理 | 模拟权限拒绝 | 显示友好错误信息 | |
| ✅ 性能表现 | 长时间运行 | CPU 占用率 < 20%，内存稳定 | |

## 6. 常见问题排查

### ❌ 问题1: "Failed to create offscreen document"
**原因**: `background.ts` 中 `reasons` 参数包含无效值（如 `AUDIO_PROCESSING`）
**解决方案**: 
```typescript
// 修改前（错误）
reasons: ['USER_MEDIA', 'AUDIO_PROCESSING']

// 修改后（正确）
reasons: ['USER_MEDIA']
```

### ❌ 问题2: "captureStream not supported"
**原因**: 浏览器版本过低或 CORS 限制
**解决方案**:
- 使用 Chrome 90+ 版本
- 确保视频源允许跨域访问
- 检查视频元素是否支持 `captureStream`

### ❌ 问题3: AI 模型加载失败
**原因**: 网络问题或模型文件缺失
**解决方案**:
- 检查网络连接
- 确认 `@xenova/transformers` 依赖已安装
- 查看控制台详细错误信息

### ❌ 问题4: 音频处理无效果
**原因**: AudioWorklet 未正确连接或参数配置错误
**解决方案**:
- 检查 `audio-worklet.ts` 中的 `registerProcessor`
- 确认 `offscreen/main.ts` 中的 `addModule` 路径正确
- 验证 `chrome.runtime.getURL('assets/audio-worklet.ts')` 返回正确 URL

### ❌ 问题5: 状态显示不更新
**原因**: 消息通信中断或事件监听器未注册
**解决方案**:
- 检查 `background.ts` 中的消息转发逻辑
- 确认 `offscreen/main.ts` 中的 `port.onmessage` 正确设置
- 验证 Popup 中的事件监听器

## 7. 性能监控

### 7.1 查看扩展资源使用
1. 访问 `chrome://extensions/`
2. 点击扩展的 **详情** → **后台页面**
3. 在开发者工具中查看：
   - Memory usage
   - CPU usage
   - Network requests

### 7.2 实时监控
- 在 Popup 中观察音量表和音频信息卡片的实时更新
- 使用 Chrome 的 Performance 面板记录音频处理性能

## 8. 测试报告模板

```markdown
## SonicSense AI 测试报告
- 测试日期: YYYY-MM-DD
- 浏览器版本: Chrome XX.X.XXXX.XX
- 操作系统: Windows 10/11

### 功能测试结果
| 功能 | 结果 | 备注 |
|------|------|------|
| 扩展加载 | ✅/❌ | |
| Popup UI | ✅/❌ | |
| 音频捕获 | ✅/❌ | |
| 增益补偿 | ✅/❌ | |
| 降噪处理 | ✅/❌ | |
| 声纹校准 | ✅/❌ | |
| 消息通信 | ✅/❌ | |
| 状态管理 | ✅/❌ | |

### 性能指标
- CPU 占用率: ___%
- 内存使用: ___ MB
- 音频处理延迟: ___ ms

### 发现问题
1. _______________
2. _______________

### 测试结论
□ 完全正常 □ 需要修复 □ 严重问题
```

---

📝 **提示**: 测试时建议使用 Chrome 最新稳定版，确保 Web Audio API 和 AudioWorklet 支持完整。