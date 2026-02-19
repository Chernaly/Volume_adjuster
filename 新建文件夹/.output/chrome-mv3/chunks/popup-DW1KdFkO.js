import"./_virtual_wxt-html-plugins-DPbbfBKe.js";function b({value:e,onChange:s}){return`
    <div class="volume-bar-container">
      <label class="volume-label">增益调节：${e.toFixed(1)} dB</label>
      <input
        type="range"
        class="volume-slider"
        min="-20"
        max="20"
        step="0.5"
        value="${e}"
        data-action="volume-change"
      />
      <div class="volume-values">
        <span>-20</span>
        <span>0</span>
        <span>+20</span>
      </div>
    </div>
  `}function m({level:e}){const s=Math.max(0,Math.min(100,e)),t=10,n=Math.floor(s/10);let i="";for(let o=t-1;o>=0;o--){const l=o<n,v=o<3?"low":o<6?"medium":"high";i+=`<div class="volume-segment ${l?"active "+v:""}"></div>`}return`
    <div class="volume-meter">
      ${i}
    </div>
  `}function f({status:e,text:s=""}){return`
    <div class="status-indicator ${e}">
      <div class="status-dot"></div>
      <span class="status-text">${s||{idle:"待机",processing:"处理中",error:"错误",calibrating:"校准中"}[e]}</span>
    </div>
  `}function h({rms:e,pitch:s,gain:t}){return`
    <div class="audio-info-card">
      <div class="info-item">
        <span class="info-label">RMS</span>
        <span class="info-value">${e.toFixed(4)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">音高</span>
        <span class="info-value">${s>0?s.toFixed(1)+" Hz":"--"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">增益</span>
        <span class="info-value">${(t*100).toFixed(0)}%</span>
      </div>
    </div>
  `}function d({action:e,label:s,icon:t="",disabled:n=!1,active:i=!1}){const o=["control-btn",e];return n&&o.push("disabled"),i&&o.push("active"),`
    <button class="${o.join(" ")}" data-action="${e}" ${n?"disabled":""}>
      ${t?`<span class="btn-icon">${t}</span>`:""}
      <span class="btn-label">${s}</span>
    </button>
  `}function p({id:e,label:s,checked:t}){return`
    <div class="toggle-switch">
      <label class="toggle-label">${s}</label>
      <label class="switch">
        <input type="checkbox" data-action="${e}" ${t?"checked":""}>
        <span class="slider"></span>
      </label>
    </div>
  `}const y={status:"idle",rms:0,pitch:0,gain:1,volumeLevel:0,targetRMS:.1,noiseReductionEnabled:!0,voicePrintEnabled:!0};function $(e=y){return`
    <div class="sonic-sense-popup">
      <header class="popup-header">
        <h1>🎵 SonicSense AI</h1>
        <p class="subtitle">实时声纹特征提取与人声分离</p>
      </header>
      
      <main class="popup-main">
        <!-- 状态显示区域 -->
        <section class="status-section">
          ${f({status:e.status})}
        </section>
        
        <!-- 音量表区域 -->
        <section class="volume-meter-section">
          ${m({level:e.volumeLevel})}
        </section>
        
        <!-- 音频信息卡片 -->
        <section class="info-section">
          ${h({rms:e.rms,pitch:e.pitch,gain:e.gain})}
        </section>
        
        <!-- 增益控制 -->
        <section class="control-section">
          ${b({value:e.gain>0?20*Math.log10(e.gain):-20,onChange:()=>{}})}
        </section>
        
        <!-- 设置开关 -->
        <section class="settings-section">
          ${p({id:"noise-reduction",label:"降噪",checked:e.noiseReductionEnabled})}
          ${p({id:"voice-print",label:"声纹提取",checked:e.voicePrintEnabled})}
        </section>
        
        <!-- 控制按钮 -->
        <section class="actions-section">
          ${d({action:e.status==="processing"?"stop":"start",label:e.status==="processing"?"停止处理":"开始处理",icon:e.status==="processing"?"⏹":"▶"})}
          ${d({action:"calibrate",label:"声纹校准",icon:"🎤",disabled:e.status!=="processing"})}
          <button class="control-btn settings" data-action="open-settings">
            <span class="btn-icon">⚙</span>
            <span class="btn-label">设置</span>
          </button>
        </section>
      </main>
      
      <footer class="popup-footer">
        <span>v0.1.0</span>
      </footer>
    </div>
  `}console.log("SonicSense AI Popup loaded");const a={status:"idle",rms:0,pitch:0,gain:1,volumeLevel:0,noiseReductionEnabled:!0,voicePrintEnabled:!0,isPlaying:!1};let u=0;function r(){const e=document.getElementById("app");e&&(e.innerHTML=$(a),L())}function g(e){const s=Math.min(100,e/.3*100);u=u*.7+s*.3,a.volumeLevel=u}function c(e){return new Promise((s,t)=>{chrome.runtime.sendMessage(e,n=>{chrome.runtime.lastError?t(chrome.runtime.lastError):s(n)})})}async function M(){a.status==="processing"?await c({type:"play_control",action:"stop"}):await c({type:"play_control",action:"start"})}function E(){chrome.runtime.openOptionsPage()}async function P(){await c({type:"voice_print_calibration",duration:5})}async function S(e){const s=Math.pow(10,e/20);a.gain=s,await c({type:"settings_update",settings:{gain:s}}),r()}async function k(e){a.noiseReductionEnabled=e,await c({type:"noise_reduction_config",enabled:e}),r()}async function w(e){a.voicePrintEnabled=e,await c({type:"settings_update",settings:{voicePrintEnabled:e}}),r()}function L(){const e=document.querySelector(".volume-slider");e&&e.addEventListener("input",n=>{const i=parseFloat(n.target.value);S(i)}),document.querySelectorAll(".control-btn").forEach(n=>{n.addEventListener("click",()=>{switch(n.dataset.action){case"start":case"stop":M();break;case"calibrate":P();break;case"open-settings":E();break}})}),document.querySelectorAll('input[type="checkbox"]').forEach(n=>{n.addEventListener("change",i=>{const o=i.target.dataset.action,l=i.target.checked;switch(o){case"noise-reduction":k(l);break;case"voice-print":w(l);break}})})}function _(e){switch(console.log("Popup received message:",e),e.type){case"audio_analysis":const s=e;a.rms=s.rms,a.gain=s.gain,g(s.rms);break;case"voice_print":const t=e;a.pitch=t.pitch,a.rms=t.rms,g(t.rms);break;case"play_status":const n=e;a.isPlaying=n.isPlaying,a.status=n.isPlaying?"processing":"idle";break;case"status":const i=e;a.status=i.status;break;case"error":console.error("Popup received error:",e),a.status="error";break;case"noise_reduction_status":const l=e;a.noiseReductionEnabled=l.enabled;break}r()}function x(){console.log("SonicSense AI Popup initialized"),chrome.runtime.onMessage.addListener(_),c({type:"settings_update",settings:{}}).catch(()=>{}),r()}x();
