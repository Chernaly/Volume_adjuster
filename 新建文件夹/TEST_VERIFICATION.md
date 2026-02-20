# SonicSense AI 端到端功能验证报告

> **日期**：2026年2月20日  
> **提交版本**：`9b5343c`  
> **构建命令**：`npm run build`  
> **输出目录**：`.output/chrome-mv3`

## 1. 验证环境
| 项目 | 值 |
|------|----|
| 操作系统 | Windows 10/11 (win32) |
| 浏览器 | Google Chrome 最新版（建议 ≥ 120） |
| 扩展模式 | 开发者模式加载（未打包） |
| 测试页面 | YouTube 视频页、本地 `test.html` |

## 2. 验证步骤与预期结果

### ✅ 场景 1：正常音频捕获与处理（YouTube）
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 加载 `.output/chrome-mv3` 到 `chrome://extensions` | 扩展启用，权限正常 |
| 2 | 打开 YouTube 视频页 | 页面正常播放 |
| 3 | 点击扩展图标 → Popup | 显示状态指示器、音量表、控制按钮 |
| 4 | 点击 **▶ 开始处理** | - 发送 `init_audio_context` → `play_control:start`<br>- Offscreen 日志：`AudioContext created (state: suspended)` → `resume()` → `AI model loaded`<br>- Popup 状态变为 **Processing**（绿色脉冲）<br>- 音量表随音频动态变化 |
| 5 | 播放视频 10 秒 | `RMS` 在 0.02~0.25 波动；`Gain` 自动调整；无报错 |

### ⚠️ 场景 2：captureStream fallback（跨域视频）
> *模拟条件：页面含跨域 `<video src="https://example.com/xxx.mp4">`*
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开含跨域视频的本地 HTML（如 `test.html`） | 页面加载，但视频可能因 CORS 不自动播放 |
| 2 | 点击 **▶ 开始处理** | - Content Script 日志：`SecurityError: CORS restriction prevents capture`<br>- 发送 `audio_stream_fallback` 消息<br>- Offscreen 收到后不报错，保持 idle<br>- Popup 状态仍为 `idle` 或显示提示（当前未实现 UI 提示） |

### 🔍 场景 3：内存与性能检查
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 运行 5 分钟以上，持续播放视频 | - Task Manager 中扩展进程内存稳定（无持续增长）<br>- Performance 面板：主线程帧率 ≥ 55 FPS（节流生效） |
| 2 | 关闭标签页/浏览器 | - Offscreen `unload` 日志出现<br>- `clearInterval` / `observer.disconnect()` 被调用 |

## 3. 实际测试结果（请填写）

### 场景 1：YouTube 正常流程
- [ ] 扩展成功加载  
- [ ] 点击“开始处理”后状态变为 Processing  
- [ ] RMS / Gain 实时更新  
- [ ] 无 `AudioContext` 初始化错误  
- **备注**：_________________________

### 场景 2：fallback 行为
- [ ] 捕获失败时发送 `audio_stream_fallback`  
- [ ] Popup 未崩溃，状态可恢复  
- **备注**：_________________________

### 场景 3：长期运行
- [ ] 内存无泄漏（30分钟后 ≤ +50MB）  
- [ ] 主线程无卡顿（Performance 记录）  
- **备注**：_________________________

## 4. 问题与改进建议
| 问题 | 严重性 | 建议 |
|------|--------|------|
| fallback 无用户提示 | 🟡 Medium | 在 popup 添加“⚠️ 音频捕获受限，请确保媒体已播放”提示 |
| offscreen 未处理 `audio_stream_fallback` 后续逻辑 | 🟢 Low | 可增加重试按钮或静默降级为本地分析 |
| 无自动化 E2E 测试 | 🟠 High | 后续引入 Playwright 模拟点击与音频流 |

## 5. MFCC 精度验证（新增）
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 在 `offscreen/main.ts` 中临时记录 `mfcc` 数组（如 `console.log('MFCC:', mfcc)`） | 日志中输出 13 个浮点数 |
| 2 | 播放纯音（如 440Hz 正弦波） | MFCC 第 1-3 系数应稳定（低频能量高） |
| 3 | 对比旧版（简化）与新版（标准）输出 | 新版应更平滑、抗噪性更强；第 0 系数（能量）更准确 |
| 4 | 使用 `test/mfcc.test.ts` 运行离线验证 | 7/7 测试通过，无 NaN/Infinity |

## 6. WebGPU 加速 PoC 验证（新增）
| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开 `demo/webgpu-fft.html`（需 Chrome ≥ 113 + 启用 chrome://flags#enable-webgpu-developer-tools） | 页面加载成功 |
| 2 | 点击 "Run FFT (256 points)" | 控制台无报错，显示 "✅ WebGPU FFT succeeded" |
| 3 | 检查输出频谱峰值位置 | 440Hz 信号应在 bin ≈ 2.5（256 * 440 / 44100 ≈ 2.5）处有峰值 |
| 4 | 对比 CPU FFT 耗时（可选） | WebGPU 应快于 WASM FFT（尤其在大数组） |

> 💡 注意：AudioWorklet 当前不支持 WebGPU，PoC 在普通页面运行；后续可迁移至 offscreen document。

---
*报告生成于：2026-02-20*