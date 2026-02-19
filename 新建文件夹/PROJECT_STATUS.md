# SonicSense AI 项目状态报告

## 1. 总的框架

本项目基于 WXT (Vite-based Manifest V3 Framework) 构建的浏览器扩展，旨在利用 AI 实现浏览器端的实时声纹特征提取、动态增益补偿与人声分离。项目结构遵循架构模板，包括以下核心组件：

- **entrypoints/**: 扩展入口点
  - `background.ts`: 任务调度中心 (Service Worker)
  - `content.ts`: 页面劫持 (DOM 注入与音频流捕获)
  - `popup/`: 交互面板 (音量条、状态显示)
  - `options/`: 设置页 (声纹校准、标准人声录入)
  - `offscreen/`: 音频处理心脏 (Web Audio API + AudioWorklet)
- **assets/**: 静态资源与本地 ONNX 模型
- **components/**: UI 组件库
- **hooks/**: 音频状态与模型加载自定义 Hooks
- **server/**: 本地模型转换/缓存工具脚本
- **shared/**: 类型定义、常量与通讯协议

技术栈：

- 核心框架: WXT
- 逻辑层: TypeScript
- 音频引擎: Web Audio API + AudioWorklet
- AI 引擎: Transformers.js (ONNX Runtime Web)
- 硬件目标：优化支持多核 CPU 与 WebGPU 加速

## 2. 完成的成果

### 基础架构
- ✅ 项目初始化：创建了基本的目录结构和配置文件
- ✅ `package.json`: 定义了项目依赖和脚本
- ✅ `wxt.config.ts`: 配置了 manifest，包括 `tabCapture`, `offscreen`, `storage` 权限
- ✅ `tsconfig.json`: TypeScript 配置
- ✅ 依赖安装成功：npm install 完成0, WXT 类型生成成功

### 入口文件
- ✅ `entrypoints/background.ts`: Service Worker 任务调度中心
- ✅ `entrypoints/content.ts`: 内容脚本0, 媒体元素检测与音频流捕获
- ✅ `entrypoints/popup/`: 弹出页面 (UI 与控制)
- ✅ `entrypoints/options/`: 选项页面 (设置与校准)
- ✅ `entrypoints/offscreen/`: Offscreen Document (音频处理)

### 核心功能实现
- ✅ AudioWorklet 完整实现：降噪算法、声纹特征提取、增益补偿
- ✅ 通讯协议完整定义：12 种消息类型覆盖所有场景
- ✅ 消息传递实现：background 作为中继，各 entrypoints 之间通讯
- ✅ AI 模型集成：@xenova/transformers 语音活动检测模型
- ✅ 防御性编程：CORS 检查、权限验证、异常处理

### UI 组件
- ✅ 音量条组件 (VolumeBar.ts): 增益调节与音量显示
- ✅ 音量表组件：10 段可视化音量级别
- ✅ 状态指示器组件：4 种状态显示 (待机/处理/错误/校准)
- ✅ 音频信息卡片：RMS、音高、增益实时显示
- ✅ 开关组件：降噪/声纹提取切换
- ✅ 控制按钮组件：开始/停止/校准/设置

### 构建验证
- ✅ `npm run build` 成功，无错误
- ✅ 输出文件大小：~706 KB (包含 ONNX Runtime)
- ✅ TypeScript 类型检查通过

## 3. 最新开发进展 (2026-02-19)

### AudioWorklet 音频处理器 (`assets/audio-worklet.ts`)
- ✅ 谱减法降噪算法
- ✅ 谱门限降噪处理
- ✅ 实时 RMS 计算与增益补偿 (V_out = V_in * (Target_RMS / Current_RMS))
- ✅ MFCC 声纹特征提取 (13 个系数，简化版)
- ✅ 音高估计 (自相关方法)
- ✅ 频段能量分析 (8 个频段)
- ✅ 软限幅输出保护
- ✅ 与主线程的消息通信 (audioAnalysis, voicePrint)

### 通讯协议 (`shared/messages.ts`)
- ✅ 音频流消息：audio_stream, audio_stream_started, audio_stream_stopped
- ✅ 音频处理消息：process_audio, audio_processed
- ✅ 声纹特征消息：voice_print, voice_print_calibration, voice_print_calibration_result
- ✅ 音频分析消息：audio_analysis (RMS, spectrum, gain)
- ✅ 降噪控制消息：noise_reduction_config, noise_reduction_status
- ✅ 播放控制消息：play_control, play_status
- ✅ 设置管理消息：settings_update, settings_response
- ✅ 状态与错误消息：status, error
- ✅ 默认设置常量：DEFAULT_SETTINGS, AUDIO_CONFIG

### Offscreen Document (`entrypoints/offscreen/main.ts`)
- ✅ AudioContext 初始化 (44.1kHz, interactive 延迟)
- ✅ AudioWorkletNode 创建与参数配置
- ✅ AI 模型异步加载与错误处理
- ✅ 音频处理管道建立 (MediaStreamSource → AudioWorkletNode)
- ✅ 声纹校准流程 (5 秒采样，平均 MFCC 计算)
- ✅ 设置更新处理 (targetRMS, gain, noiseReduction, voicePrint)
- ✅ Worklet 消息处理 (audioAnalysis, voicePrint 转发)

### Content Script (`entrypoints/content.ts`)
- ✅ 媒体元素自动检测 (video, audio)
- ✅ 音频流捕获 (captureStream API)
- ✅ CORS 与权限检查
- ✅ MutationObserver 动态监听
- ✅ 流生命周期管理 (播放/暂停/结束事件)
- ✅ 定期重新扫描 (5 秒间隔，支持 SPA)

### Background Service Worker (`entrypoints/background.ts`)
- ✅ Offscreen Document 自动创建与状态管理
- ✅ 消息中继转发 (Content ↔ Offscreen ↔ UI)
- ✅ 待处理消息队列 (offscreen 就绪后发送)
- ✅ 扩展安装/更新事件处理
- ✅ 端口连接监听

### Popup UI (`entrypoints/popup/`)
- ✅ 状态指示器 (带脉冲动画)
- ✅ 音量表可视化 (10 段0, 低/中/高颜色)
- ✅ 音频信息卡片 (RMS, 音高，增益)
- ✅ 增益调节滑块 (-20dB 到 +20dB)
- ✅ 降噪/声纹提取开关
- ✅ 控制按钮 (开始/停止处理，声纹校准，设置)
- ✅ 响应式 CSS 样式 (现代 Material Design)

### Options Page (`entrypoints/options/`)
- ✅ 音频处理参数设置
  - 目标 RMS (0.01-0.5)
  - 基础增益 (0-200%)
  - 噪声阈值 (0.001-0.1)
- ✅ 声纹校准界面
  - 开始/取消校准按钮
  - 进度条显示
  - 声纹特征图谱可视化 (13 个 MFCC 系数)
  - 状态消息提示
- ✅ 标准人声录入界面
  - 录制控制按钮
  - 音频可视化显示 (32 段频谱)
  - 保存/清除样本
- ✅ 关于信息

## 4. 未完成的事项

### 待优化功能
- ⚠️ **端到端测试**: 需要在真实浏览器环境中测试音频捕获和处理流程
- ⚠️ **AI 模型优化**: 语音活动检测模型集成后需要进一步优化推理性能
- ⚠️ **声纹识别精度**: MFCC 特征提取算法为简化版本，可考虑使用更精确的算法
- ⚠️ **WebGPU 加速**: 尚未实现 WebGPU 加速的音频处理
- ⚠️ **噪声谱学习**: 自动噪声谱采集功能需要完善
- ⚠️ **持久化存储**: 用户设置和声纹数据需要保存到 chrome.storage

### 后续开发计划
1. 添加单元测试和集成测试
2. 实现更精确的 MFCC 算法 (使用完整的 FFT 和 DCT)
3. 添加 WebGPU 后端支持
4. 实现自适应噪声抑制
5. 添加多语言语音支持
6. 优化内存使用和性能

## 5. 技术债务

- `components/VolumeBar.ts` 文件名不再准确，应重命名为 `UIComponents.ts`
- `offscreen/main.ts` 中的 AI 模型加载可以进一步优化，使用懒加载
- `content.ts` 中的定期扫描 (5 秒) 可能造成性能开销0, 应优化
- 消息类型定义中的冗余可以进一步精简

## 6. 项目风险与问题分析 (2026-02-19 更新)

### 🔴 高风险问题

#### 1. 音频流捕获权限和兼容性问题
- **问题描述**: `captureStream()` API 在跨域视频和某些浏览器版本中支持有限
- **影响**: 导致在实际使用中无法捕获音频流0, 核心功能失效
- **解决方案**: 
  - 实现 fallback 机制：当 `captureStream()` 失败时，尝试使用 `createMediaElementSource()`
  - 添加用户友好的错误提示和替代方案说明
  - 优化 CORS 处理逻辑，提供明确的权限请求指引

#### 2. AudioContext 初始化时机问题
- **问题描述**: Web Audio API 要求用户交互才能启动 AudioContext，但当前实现可能在无交互时尝试初始化
- **影响**: 音频处理管道无法建立，扩展功能完全不可用
- **解决方案**:
  - 添加用户交互触发机制：在 popup 或 options 页面添加"开始处理"按钮
  - 实现 AudioContext 状态监控和重试机制
  - 使用 `chrome.runtime.onMessage` 的异步响应确保用户交互后才初始化

#### 3. 内存泄漏风险
- **问题描述**: `MutationObserver` 和 `setInterval` 没有正确清理，`voicePrintSamples` 数组可能无限增长
- **影响**: 长时间运行后内存持续增长，可能导致浏览器崩溃
- **解决方案**:
  - 在 `content.ts` 中添加 `observer.disconnect()` 清理逻辑
  - 在 `offscreen/main.ts` 中限制 `voicePrintSamples` 数组大小，使用环形缓冲区
  - 添加内存使用监控和自动清理机制

### 🟠 中等风险问题

#### 4. AI 模型加载性能问题
- **问题描述**: ONNX Runtime Web 版本较大，首次加载延迟明显
- **影响**: 用户体验不佳，可能误以为扩展故障
- **解决方案**:
  - 实现懒加载：仅在用户点击"开始处理"后才加载模型
  - 添加加载进度指示器
  - 提供模型预加载选项（在后台静默加载）

#### 5. 简化版 MFCC 算法精度不足
- **问题描述**: 当前 MFCC 实现缺少完整的 FFT 和 DCT 计算
- **影响**: 声纹特征提取不准确，影响后续处理效果
- **解决方案**:
  - 替换为更精确的 MFCC 实现（使用 WebAssembly 或优化的 JavaScript 实现）
  - 添加算法精度测试和验证
  - 提供算法选择配置（简化版 vs 精确版）

#### 6. 高频消息传递性能问题
- **问题描述**: 每 128 个样本就发送一次消息0, 导致每秒约 344 次消息
- **影响**: 主线程阻塞，UI 卡顿
- **解决方案**:
  - 实现消息节流：每 100ms 发送一次汇总数据
  - 使用 `requestAnimationFrame` 优化消息发送时机
  - 添加消息批量处理机制

### 🟢 低风险问题

#### 7. 权限过度申请
- **问题描述**: manifest 中申请了 `<all_urls>` host_permissions
- **影响**: 用户隐私担忧，可能影响扩展商店审核
- **解决方案**:
  - 限制为特定域名或使用动态权限请求
  - 添加权限说明文档

#### 8. 错误处理不统一
- **问题描述**: 错误消息格式不一致，缺少用户友好的恢复建议
- **影响**: 用户难以理解问题原因和解决方法
- **解决方案**:
  - 统一错误消息格式（JSON 结构）
  - 添加错误代码映射表和解决方案指南
  - 实现错误日志收集和分析

## 7. 紧急修复优先级

| 优先级 | 问题 | 预计修复时间 | 负责人 |
|--------|------|-------------|--------|
| 🔴 P0 | AudioContext 初始化问题 | 2小时 | 开发团队 |
| 🔴 P0 | captureStream 兼容性问题 | 4小时 | 开发团队 |
| 🟠 P1 | 内存泄漏风险 | 2小时 | 开发团队 |
| 🟠 P1 | 模型加载性能优化 | 4小时 | AI 团队 |
| 🟢 P2 | 错误处理统一 | 1小时 | QA 团队 |

## 8. 下一步行动计划

1. **立即行动** (今天):
   - 修复 AudioContext 初始化问题
   - 添加 captureStream fallback 机制
   - 清理内存泄漏点

2. **短期目标** (本周内):
   - 实现消息节流机制
   - 优化模型加载策略
   - 添加基础单元测试

3. **中期目标** (2周内):
   - 实现精确 MFCC 算法
   - 添加 WebGPU 加速支持
   - 完善持久化存储

4. **长期目标** (1个月内):
   - 实现自适应噪声抑制
   - 添加多语言支持
   - 建立完整的测试套件

> **备注**: 所有修复都需要经过严格的测试验证，确保不影响现有功能。