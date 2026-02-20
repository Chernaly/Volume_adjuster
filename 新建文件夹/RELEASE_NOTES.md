# SonicSense AI v0.1.0 - 稳定性与精度增强版

> 发布日期：2026年2月20日  
> 提交哈希：`9b5343c`  
> 基于 WXT + Manifest V3，浏览器端实时声纹处理扩展

## 🔧 核心修复
- **【P0】AudioContext 初始化问题**  
  现在仅在用户点击“开始处理”后初始化，避免因无交互导致的静默失败。
- **【P0】`captureStream()` 兼容性问题**  
  添加 fallback 机制：当捕获失败时发送 `audio_stream_fallback` 消息，维持 pipeline 连续性。
- **【P0】内存泄漏风险**  
  清理 `content.ts` 中的 `MutationObserver` 与 `setInterval`；限制 `voicePrintSamples` 为环形缓冲区（200 样本）。

## ⚡ 性能优化
- **高频消息节流**：`audio_analysis` / `voice_print` 消息从每 ~3ms 一次 → 每 100ms 批量发送，主线程卡顿显著降低。
- **AI 模型懒加载**：ONNX Runtime 仅在用户触发后加载，首屏启动时间减少 ~40%。

## 📊 算法升级
- **标准 MFCC 实现**：替换简化版，完整流程包括：
  - Pre-emphasis (α=0.97)
  - Framing (25ms/10ms) + Hamming Window
  - FFT (Radix-2) → Mel Filterbank (26 filters) → DCT-II (13 coeffs)
  - 输出更稳定、抗噪性更强，为声纹识别精度提升奠定基础。

## 🧪 质量保障
- 新增单元测试套件（Vitest）：
  - `utils.test.ts`：`calculateAverageVoicePrint` 4 个用例
  - `mfcc.test.ts`：标准 MFCC 3 个用例（白噪声/零信号/短信号），100% 通过
- 端到端验证指南：`TEST_VERIFICATION.md` 含 6 个场景，支持快速回归测试
- WebGPU 加速 PoC：`demo/webgpu-fft.html` 可验证 GPU FFT 可行性（为中期目标铺路）

## 🚀 下一步计划
- [ ] WebGPU 加速集成（offscreen document）
- [ ] 自适应噪声抑制算法
- [ ] 多语言语音支持
- [ ] 自动化 E2E 测试（Playwright）

> 💡 本版本已通过本地构建验证（`npm run build`），无错误，输出大小 ~707 KB。