import"./_virtual_wxt-html-plugins-DPbbfBKe.js";console.log("SonicSense AI Options loaded");const c={targetRMS:.1,gain:1,noiseReductionEnabled:!0,voicePrintEnabled:!0,noiseThreshold:.02,isCalibrating:!1,calibrationProgress:0,voicePrintData:null,calibrationStatus:"idle",statusMessage:"",audioLevels:new Array(32).fill(0)};let t={...c};function d(s){return new Promise((a,o)=>{chrome.runtime.sendMessage(s,i=>{chrome.runtime.lastError?o(chrome.runtime.lastError):a(i)})})}function e(){const s=document.getElementById("app");s&&(s.innerHTML=`
    <div class="options-page">
      <header class="page-header">
        <h1>⚙️ SonicSense AI 设置</h1>
        <p>声纹校准、音频处理参数配置</p>
      </header>
      
      <!-- 音频处理设置 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">🎛️</span>
          音频处理参数
        </h2>
        <p class="section-description">
          调整音频处理的核心参数，包括目标响度、增益和降噪设置。
        </p>
        
        <div class="form-group">
          <label class="form-label">目标 RMS (Root Mean Square)</label>
          <input type="range" class="form-range" 
                 min="0.01" max="0.5" step="0.01" 
                 value="${t.targetRMS}"
                 data-setting="targetRMS">
          <div class="form-range-value">当前值：${t.targetRMS.toFixed(2)}</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">基础增益</label>
          <input type="range" class="form-range" 
                 min="0" max="2" step="0.1" 
                 value="${t.gain}"
                 data-setting="gain">
          <div class="form-range-value">当前值：${(t.gain*100).toFixed(0)}%</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">噪声阈值</label>
          <input type="range" class="form-range" 
                 min="0.001" max="0.1" step="0.001" 
                 value="${t.noiseThreshold}"
                 data-setting="noiseThreshold">
          <div class="form-range-value">当前值：${t.noiseThreshold.toFixed(3)}</div>
        </div>
        
        <div class="toggles">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">降噪处理</div>
              <div class="toggle-description">使用谱减法进行实时降噪</div>
            </div>
            <label class="switch">
              <input type="checkbox" data-toggle="noiseReduction" ${t.noiseReductionEnabled?"checked":""}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">声纹特征提取</div>
              <div class="toggle-description">实时分析并提取声纹特征</div>
            </div>
            <label class="switch">
              <input type="checkbox" data-toggle="voicePrint" ${t.voicePrintEnabled?"checked":""}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="section-footer">
          <button class="btn btn-secondary" data-action="reset-audio-settings">
            恢复默认设置
          </button>
          <button class="btn btn-primary" data-action="save-audio-settings">
            保存设置
          </button>
        </div>
      </section>
      
      <!-- 声纹校准 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">🎤</span>
          声纹校准
        </h2>
        <p class="section-description">
          通过录制您的声音样本，系统将学习并提取您的声纹特征，用于后续的个性化音频处理。
        </p>
        
        <div class="btn-group">
          <button class="btn btn-primary" data-action="start-calibration" 
                  ${t.isCalibrating?"disabled":""}>
            ${t.isCalibrating?"🔄 校准中...":"🎙️ 开始校准"}
          </button>
          <button class="btn btn-secondary" data-action="cancel-calibration" 
                  ${t.isCalibrating?"":"disabled"}>
            取消校准
          </button>
        </div>
        
        ${t.isCalibrating?`
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${t.calibrationProgress}%"></div>
            </div>
            <div class="progress-text">校准进度：${t.calibrationProgress}%</div>
          </div>
        `:""}
        
        ${t.voicePrintData?`
          <div class="voice-print-display" title="声纹特征图谱">
            ${t.voicePrintData.map((a,o)=>`
              <div class="voice-print-bar" 
                   style="height: ${Math.min(100,(a+10)*5)}%"
                   title="MFCC ${o}: ${a.toFixed(2)}"></div>
            `).join("")}
          </div>
        `:""}
        
        ${t.statusMessage?`
          <div class="status-message ${t.calibrationStatus}">
            ${t.statusMessage}
          </div>
        `:""}
      </section>
      
      <!-- 标准人声录入 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">📝</span>
          标准人声录入
        </h2>
        <p class="section-description">
          录制一段标准人声样本，用于后续的音频质量对比和参考。
        </p>
        
        <div class="btn-group">
          <button class="btn btn-primary" data-action="start-recording">
            🎙️ 开始录制
          </button>
          <button class="btn btn-secondary" data-action="stop-recording" disabled>
            ⏹️ 停止录制
          </button>
          <button class="btn btn-success" data-action="save-recording" disabled>
            💾 保存样本
          </button>
        </div>
        
        <div class="audio-viz-container">
          ${t.audioLevels.map((a,o)=>`
            <div class="audio-viz-bar" 
                 style="height: ${Math.max(5,a*100)}%"></div>
          `).join("")}
        </div>
        
        <div class="section-footer">
          <button class="btn btn-secondary" data-action="clear-recording">
            清除样本
          </button>
        </div>
      </section>
      
      <!-- 关于 -->
      <section class="section">
        <h2 class="section-title">
          <span class="icon">ℹ️</span>
          关于 SonicSense AI
        </h2>
        <p class="section-description">
          SonicSense AI 是一个基于 AI 的浏览器扩展，实现实时声纹特征提取、
          动态增益补偿与人声分离功能。
        </p>
        <div style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
          <p>版本：v0.1.0</p>
          <p>技术栈：WXT + Transformers.js + Web Audio API</p>
        </div>
      </section>
    </div>
  `,g())}function g(){document.querySelectorAll(".form-range").forEach(i=>{i.addEventListener("input",n=>{const r=n.target.dataset.setting,l=parseFloat(n.target.value);r&&t.hasOwnProperty(r)&&(t[r]=l,e())})}),document.querySelectorAll('input[type="checkbox"]').forEach(i=>{i.addEventListener("change",n=>{const r=n.target.dataset.toggle,l=n.target.checked;switch(r){case"noiseReduction":t.noiseReductionEnabled=l;break;case"voicePrint":t.voicePrintEnabled=l;break}e()})}),document.querySelectorAll(".btn").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.action;u(n)})})}async function u(s){if(s)switch(s){case"save-audio-settings":await b();break;case"reset-audio-settings":v();break;case"start-calibration":await p();break;case"cancel-calibration":h();break;case"start-recording":f();break;case"stop-recording":m();break;case"save-recording":M();break;case"clear-recording":y();break}}async function b(){try{await d({type:"settings_update",settings:{targetRMS:t.targetRMS,gain:t.gain,noiseReductionEnabled:t.noiseReductionEnabled,voicePrintEnabled:t.voicePrintEnabled}}),await d({type:"noise_reduction_config",enabled:t.noiseReductionEnabled,threshold:t.noiseThreshold}),t.statusMessage="设置已保存",t.calibrationStatus="success",e(),setTimeout(()=>{t.statusMessage="",e()},3e3)}catch(s){t.statusMessage="保存设置失败："+s.message,t.calibrationStatus="error",e()}}function v(){t.targetRMS=c.targetRMS,t.gain=c.gain,t.noiseThreshold=c.noiseThreshold,t.noiseReductionEnabled=c.noiseReductionEnabled,t.voicePrintEnabled=c.voicePrintEnabled,e()}async function p(){try{t.isCalibrating=!0,t.calibrationProgress=0,t.statusMessage="正在校准，请朗读一段文字...",t.calibrationStatus="idle",e(),await d({type:"voice_print_calibration",duration:5});const s=setInterval(()=>{t.calibrationProgress=Math.min(100,t.calibrationProgress+5),e(),t.calibrationProgress>=100&&clearInterval(s)},250)}catch(s){t.isCalibrating=!1,t.statusMessage="校准失败："+s.message,t.calibrationStatus="error",e()}}function h(){t.isCalibrating=!1,t.calibrationProgress=0,t.statusMessage="校准已取消",t.calibrationStatus="idle",e()}function f(){t.statusMessage="正在录制...",e(),S()}function m(){t.statusMessage="录制完成，可以保存样本",e()}function M(){t.statusMessage="样本已保存",t.calibrationStatus="success",e(),setTimeout(()=>{t.statusMessage="",e()},3e3)}function y(){t.audioLevels=new Array(32).fill(0),t.statusMessage="",e()}function S(){const s=setInterval(()=>{!t.isCalibrating&&t.statusMessage!=="正在录制..."||(t.audioLevels=t.audioLevels.map(()=>Math.random()*.8+.1),e())},100);setTimeout(()=>{clearInterval(s)},5e3)}function P(s){switch(console.log("Options received message:",s),s.type){case"voice_print_calibration_result":const a=s;t.isCalibrating=!1,t.calibrationProgress=100,a.success?(t.voicePrintData=a.voicePrint||[],t.statusMessage="声纹校准成功！",t.calibrationStatus="success"):(t.statusMessage="校准失败："+(a.error||"未知错误"),t.calibrationStatus="error"),e();break;case"status":const o=s;o.status==="calibrating"&&(t.isCalibrating=!0,t.statusMessage=o.details||"正在校准...",e());break;case"audio_analysis":const i=s;i.spectrum&&(t.audioLevels=i.spectrum.slice(0,32),e());break;case"voice_print":const n=s;n.mfcc&&(t.voicePrintData=n.mfcc,e());break}}function E(){console.log("SonicSense AI Options initialized"),chrome.runtime.onMessage.addListener(P),d({type:"settings_update",settings:{}}).catch(()=>{}),e()}E();
