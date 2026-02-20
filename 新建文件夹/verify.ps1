# SonicSense AI 一键验证脚本
# 功能：
#   1. 启动 Chrome（启用 WebGPU）
#   2. 打开扩展加载页
#   3. 打开 WebGPU FFT PoC
#   4. 打开 YouTube 测试页

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$extensionDir = Join-Path $PWD ".output\chrome-mv3"
$demoUrl = "file:///$($PWD.FullName)/demo/webgpu-fft.html"
$youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# 检查 Chrome 是否存在
if (-not (Test-Path $chromePath)) {
    Write-Host "❌ Chrome 未找到，请安装 Chrome 或修改 \$chromePath"
    exit 1
}

Write-Host "🚀 正在启动验证环境..."
Write-Host "   扩展目录: $extensionDir"
Write-Host "   WebGPU Demo: $demoUrl"
Write-Host "   YouTube 测试页: $youtubeUrl"

# 启动 Chrome（启用 WebGPU 开发者工具）
Start-Process $chromePath -ArgumentList @(
    "--enable-features=WebGPUDeveloperFeatures",
    "--allow-file-access-from-files",
    "--disable-web-security",
    "--user-data-dir=`"$env:TEMP\sonicsense-test`"",
    "chrome://extensions",
    $demoUrl,
    $youtubeUrl
)

Write-Host "✅ 已打开以下页面："
Write-Host "   1. chrome://extensions (请手动点击 '加载已解压的扩展程序' -> 选择 $extensionDir)"
Write-Host "   2. $demoUrl (点击 'Run FFT' 验证 WebGPU)"
Write-Host "   3. $youtubeUrl" 
Write-Host ""
Write-Host "📌 操作指引："
Write-Host "   - 在 chrome://extensions 中启用开发者模式，加载扩展"
Write-Host "   - 在 YouTube 页点击 SonicSense 图标 -> '▶ 开始处理'"
Write-Host "   - 查看 Console 日志与 Offscreen 背景页日志"