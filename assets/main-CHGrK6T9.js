import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css              */const P="http://localhost:8000",b={symbols:[],predictions:{},dashboard:null};document.querySelectorAll(".tab").forEach(t=>{t.addEventListener("click",()=>{var n;document.querySelectorAll(".tab").forEach(s=>s.classList.remove("active")),document.querySelectorAll(".view").forEach(s=>s.classList.remove("active")),t.classList.add("active");const e=`view-${t.dataset.tab}`;switch((n=document.getElementById(e))==null||n.classList.add("active"),t.dataset.tab){case"globe":w();break;case"markets":_();break;case"risk":j();break;case"opportunities":D();break}})});async function $(t,e={}){try{return await(await fetch(`${P}${t}`,{headers:{"Content-Type":"application/json"},...e})).json()}catch(n){return console.warn(`API error: ${t}`,n),null}}async function x(t,e){return $(t,{method:"POST",body:JSON.stringify(e)})}function F(){const t=document.getElementById("globe-canvas"),e=t.getContext("2d");function n(){const d=t.parentElement.getBoundingClientRect();t.width=d.width*2,t.height=d.height*2,e.scale(2,2)}n(),window.addEventListener("resize",n);let s=0;const i=[{name:"NYSE",lat:40.7,lon:-74,color:"#6366f1"},{name:"NASDAQ",lat:37.4,lon:-122,color:"#22d3ee"},{name:"LSE",lat:51.5,lon:-.1,color:"#a855f7"},{name:"TSE",lat:35.7,lon:139.7,color:"#f59e0b"},{name:"SSE",lat:31.2,lon:121.5,color:"#ef4444"},{name:"BSE",lat:19.1,lon:72.9,color:"#10b981"},{name:"FSE",lat:50.1,lon:8.7,color:"#8b5cf6"},{name:"BM&F",lat:-23.5,lon:-46.6,color:"#06b6d4"}];function a(){const d=t.width/2,v=t.height/2,r=d/2,o=v/2,c=Math.min(r,o)*.65;e.clearRect(0,0,d,v);const f=e.createRadialGradient(r,o,0,r,o,c);f.addColorStop(0,"#1a1a2e"),f.addColorStop(1,"#0a0a15"),e.beginPath(),e.arc(r,o,c,0,Math.PI*2),e.fillStyle=f,e.fill(),e.strokeStyle="#2a2a4d",e.lineWidth=1,e.stroke();for(let l=0;l<12;l++){const m=l/12*Math.PI*2+s;e.beginPath(),e.ellipse(r,o,Math.abs(Math.cos(m))*c,c,0,0,Math.PI*2),e.strokeStyle="rgba(99, 102, 241, 0.08)",e.lineWidth=.5,e.stroke()}for(let l=1;l<6;l++){const m=o-c+2*c*l/6,p=Math.sqrt(c*c-(m-o)*(m-o));e.beginPath(),e.ellipse(r,m,p,p*.15,0,0,Math.PI*2),e.strokeStyle="rgba(99, 102, 241, 0.06)",e.lineWidth=.5,e.stroke()}i.forEach(l=>{const m=l.lon/180*Math.PI+s,p=l.lat/180*Math.PI,I=Math.cos(p)*Math.sin(m),y=Math.cos(p)*Math.cos(m),M=Math.sin(p);if(y<-.1)return;const g=r+I*c,u=o-M*c,E=.4+y*.6,h=3+y*3,k=e.createRadialGradient(g,u,0,g,u,h*4);k.addColorStop(0,l.color+"40"),k.addColorStop(1,"transparent"),e.beginPath(),e.arc(g,u,h*4,0,Math.PI*2),e.fillStyle=k,e.fill(),e.beginPath(),e.arc(g,u,h,0,Math.PI*2),e.fillStyle=l.color,e.globalAlpha=E,e.fill(),e.globalAlpha=1,y>.3&&(e.fillStyle="#888",e.font="9px Inter, sans-serif",e.fillText(l.name,g+h+4,u+3))});for(let l=0;l<i.length;l++)for(let m=l+1;m<i.length;m++){const p=i[l],I=i[m],y=p.lon/180*Math.PI+s,M=p.lat/180*Math.PI,g=I.lon/180*Math.PI+s,u=I.lat/180*Math.PI,E=Math.cos(M)*Math.cos(y),h=Math.cos(u)*Math.cos(g);if(E<0||h<0)continue;const k=r+Math.cos(M)*Math.sin(y)*c,S=o-Math.sin(M)*c,L=r+Math.cos(u)*Math.sin(g)*c,T=o-Math.sin(u)*c;Math.sqrt((k-L)**2+(S-T)**2)>c*1.5||(e.beginPath(),e.moveTo(k,S),e.lineTo(L,T),e.strokeStyle=`rgba(99, 102, 241, ${.04+E*h*.06})`,e.lineWidth=.5,e.stroke())}s+=.003,requestAnimationFrame(a)}a()}async function w(){var e,n;const t=await $("/market/dashboard");if(!t){A();return}if(b.dashboard=t,b.symbols=t.tracked_symbols||[],t.regime){const s=document.getElementById("regime-badge"),i=document.getElementById("regime-label"),a=((e=t.regime)==null?void 0:e.regime)||"loading";i.textContent=a.replace("_"," "),s.className="regime-badge "+(a.includes("bull")?"bull":a.includes("bear")?"bear":"")}t.last_update&&(document.getElementById("last-update").textContent=new Date(t.last_update).toLocaleTimeString()),document.getElementById("globe-symbols").textContent=((n=t.tracked_symbols)==null?void 0:n.length)||"--",document.getElementById("globe-predictions").textContent=Object.keys(t.predictions||{}).length,document.getElementById("globe-countries").textContent="7",C(t.predictions||{}),B(t.tracked_symbols||[])}function A(){const t=["^GSPC","^IXIC","AAPL","GOOGL","MSFT","NVDA","TSLA","BTC-USD","GC=F"],e={};t.forEach(n=>{const s=Math.random()>.5?"up":"down";e[n]={direction:s,confidence:+(.4+Math.random()*.4).toFixed(2),predicted_return:+((Math.random()-.5)*.04).toFixed(4),current_price:+(1e3+Math.random()*5e3).toFixed(2)}}),document.getElementById("globe-symbols").textContent=t.length,document.getElementById("globe-predictions").textContent=t.length,document.getElementById("globe-countries").textContent="7",document.getElementById("regime-label").textContent="Sideways",C(e),B(t),b.symbols=t,b.predictions=e}function C(t){const e=document.getElementById("market-ticker");e.innerHTML=Object.entries(t).map(([n,s])=>{const i=s.direction==="up"?"up":s.direction==="down"?"down":"flat",a=s.direction==="up"?"▲":s.direction==="down"?"▼":"—",d=s.predicted_return!=null?(s.predicted_return*100).toFixed(2)+"%":"--";return`
      <div class="ticker-card" onclick="navigateToPredict('${n}')">
        <div>
          <div class="ticker-symbol">${n}</div>
          <div class="ticker-price">${s.current_price?"$"+Number(s.current_price).toLocaleString():"--"}</div>
        </div>
        <div>
          <div class="ticker-change ${i}">${a} ${d}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-align:right">${(s.confidence*100).toFixed(0)}% conf</div>
        </div>
      </div>
    `}).join("")}function B(t){["predict-symbol","debate-symbol","bt-symbol"].forEach(e=>{const n=document.getElementById(e);n&&(n.innerHTML=t.map(s=>`<option value="${s}">${s}</option>`).join(""))})}window.navigateToPredict=function(t){document.querySelector('[data-tab="predict"]').click(),document.getElementById("predict-symbol").value=t};async function _(){const t=document.getElementById("markets-grid");t.innerHTML='<div class="loading-state"><div class="spinner"></div> Loading market data...</div>';const e=b.symbols.length?b.symbols:["^GSPC","^IXIC","AAPL","GOOGL","MSFT","NVDA","TSLA","BTC-USD","GC=F"],n=[];for(const s of e){const i=await $(`/market/features/${s}`);i?n.push(H(s,i)):n.push(N(s))}t.innerHTML=n.join("")}function H(t,e){const n=e.tech_current_price||"--",s=e.tech_rsi_14||"--",i=e.tech_volatility_21d?(e.tech_volatility_21d*100).toFixed(1)+"%":"--",a=e.tech_return_21d?(e.tech_return_21d*100).toFixed(2)+"%":"--",d=e.tech_macd||"--",v=e.tech_zscore_50||"--",r=e.fund_pe_ratio||"--",o=e.fund_beta||"--";return`
    <div class="market-card">
      <div class="market-card-header">
        <div>
          <div class="market-card-symbol">${t}</div>
        </div>
        <div class="market-card-price">$${Number(n).toLocaleString()}</div>
      </div>
      <div class="market-card-indicators">
        <div class="indicator"><span class="indicator-label">RSI(14)</span><span class="indicator-value">${s}</span></div>
        <div class="indicator"><span class="indicator-label">Volatility</span><span class="indicator-value">${i}</span></div>
        <div class="indicator"><span class="indicator-label">21d Return</span><span class="indicator-value">${a}</span></div>
        <div class="indicator"><span class="indicator-label">MACD</span><span class="indicator-value">${d}</span></div>
        <div class="indicator"><span class="indicator-label">Z-Score</span><span class="indicator-value">${v}</span></div>
        <div class="indicator"><span class="indicator-label">P/E</span><span class="indicator-value">${r}</span></div>
        <div class="indicator"><span class="indicator-label">Beta</span><span class="indicator-value">${o}</span></div>
      </div>
    </div>
  `}function N(t){return`
    <div class="market-card">
      <div class="market-card-header">
        <div class="market-card-symbol">${t}</div>
        <div class="market-card-price" style="color:var(--text-muted)">--</div>
      </div>
      <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.8rem">
        Start the backend to load live data
      </div>
    </div>
  `}document.getElementById("btn-predict").addEventListener("click",async()=>{const t=document.getElementById("predict-symbol").value,e=document.getElementById("predict-horizon").value,n=document.getElementById("btn-predict");n.disabled=!0,n.innerHTML='<div class="spinner"></div>',document.getElementById("predict-result").innerHTML='<div class="loading-state"><div class="spinner"></div> Running ensemble prediction...</div>';const s=await x("/market/predict",{symbol:t,horizon:parseInt(e)});if(n.disabled=!1,n.textContent="Run Prediction",!s||s.error){document.getElementById("predict-result").innerHTML=`<div class="empty-state">Error: ${(s==null?void 0:s.error)||"Backend not running. Start the market engine."}</div>`;return}R(s)});function R(t){const e=t.ensemble||{},n=e.direction||"flat",s=e.confidence||0,i=e.predicted_return||0,a=n==="up"?"↑":n==="down"?"↓":"→",d=n==="up"?"var(--green)":n==="down"?"var(--red)":"var(--accent)";document.getElementById("predict-result").innerHTML=`
    <div class="predict-direction">
      <div class="direction-arrow ${n}">${a}</div>
      <div class="direction-text">
        <h3 style="color:${d}">${n.toUpperCase()}</h3>
        <div style="color:var(--text-dim);font-size:0.85rem">${t.symbol} · ${(s*100).toFixed(1)}% confidence</div>
      </div>
    </div>
    <div class="confidence-bar">
      <div class="confidence-fill" style="width:${s*100}%;background:${d}"></div>
    </div>
    <div class="predict-metrics">
      <div class="predict-metric">
        <div class="pm-value" style="color:${d}">${(i*100).toFixed(2)}%</div>
        <div class="pm-label">Predicted Return</div>
      </div>
      <div class="predict-metric">
        <div class="pm-value">${(s*100).toFixed(0)}%</div>
        <div class="pm-label">Confidence</div>
      </div>
      <div class="predict-metric">
        <div class="pm-value">${e.consensus_strength?(e.consensus_strength*100).toFixed(0)+"%":"--"}</div>
        <div class="pm-label">Consensus</div>
      </div>
    </div>
  `;const v=t.models||{};document.getElementById("model-breakdown").innerHTML=Object.entries(v).map(([o,c])=>{const f=c.direction||"flat";return`
      <div class="model-item">
        <span class="model-name">${o}</span>
        <span class="model-direction ${f}">${f.toUpperCase()}</span>
        <span class="model-conf">${c.confidence?(c.confidence*100).toFixed(0)+"%":"--"}</span>
      </div>
    `}).join("");const r=t.features_summary||{};document.getElementById("features-grid").innerHTML=Object.entries(r).map(([o,c])=>`
    <div class="feature-item">
      <span class="feature-key">${o.replace("tech_","").replace("fund_","").replace("macro_","")}</span>
      <span class="feature-val">${typeof c=="number"?c.toFixed(4):c}</span>
    </div>
  `).join("")}document.getElementById("btn-debate").addEventListener("click",async()=>{const t=document.getElementById("debate-symbol").value,e=document.getElementById("btn-debate"),n=document.getElementById("debate-layout");e.disabled=!0,e.innerHTML='<div class="spinner"></div>',n.innerHTML='<div class="loading-state"><div class="spinner"></div> Running Bull vs Bear vs Neutral debate...</div>',n.className="debate-layout";const s=await x(`/market/debate/${t}`,{});if(e.disabled=!1,e.textContent="Start Debate",!s||s.error){n.innerHTML=`<div class="empty-state">Error: ${(s==null?void 0:s.error)||"Backend not running"}</div>`;return}n.className="debate-layout active",n.innerHTML=`
    <div class="debate-agent bull">
      <div class="agent-header">
        <div class="agent-icon">📈</div>
        <div class="agent-name">Bull Analyst</div>
      </div>
      <div class="agent-text">${s.bull||"No response"}</div>
    </div>
    <div class="debate-agent bear">
      <div class="agent-header">
        <div class="agent-icon">📉</div>
        <div class="agent-name">Bear Analyst</div>
      </div>
      <div class="agent-text">${s.bear||"No response"}</div>
    </div>
    <div class="debate-agent neutral">
      <div class="agent-header">
        <div class="agent-icon">📊</div>
        <div class="agent-name">Quant Analyst</div>
      </div>
      <div class="agent-text">${s.neutral||"No response"}</div>
    </div>
    <div class="debate-synthesis">
      <div class="synthesis-header">Synthesis</div>
      <div class="synthesis-text">${s.synthesis||"No synthesis available"}</div>
      <div class="synthesis-meta">
        <span>Consensus: <strong style="color:var(--accent)">${s.consensus_direction||"--"}</strong></span>
        <span>Conviction: <strong>${s.conviction_level?(s.conviction_level*100).toFixed(0)+"%":"--"}</strong></span>
        ${s.actionable_insight?`<span>Action: <strong>${s.actionable_insight}</strong></span>`:""}
      </div>
    </div>
  `});document.getElementById("btn-backtest").addEventListener("click",async()=>{var v,r;const t=document.getElementById("bt-strategy").value,e=document.getElementById("bt-symbol").value,n=document.getElementById("bt-capital").value,s=document.getElementById("btn-backtest"),i=document.getElementById("backtest-result");s.disabled=!0,s.innerHTML='<div class="spinner"></div>',i.innerHTML='<div class="loading-state"><div class="spinner"></div> Running walk-forward backtest...</div>',i.className="backtest-result";const a=await x("/market/backtest",{strategy:t,symbol:e,initial_capital:parseInt(n)});if(s.disabled=!1,s.textContent="Run Backtest",!a||a.error){i.innerHTML=`<div class="empty-state">Error: ${(a==null?void 0:a.error)||"Backend not running"}</div>`;return}i.className="backtest-result active";const d=a.total_return>=0?"var(--green)":"var(--red)";i.innerHTML=`
    <div class="bt-metrics">
      <h3>Performance Metrics</h3>
      <div class="bt-metric-grid">
        <div class="bt-metric">
          <div class="bm-value" style="color:${d}">${(a.total_return*100).toFixed(2)}%</div>
          <div class="bm-label">Total Return</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${((v=a.sharpe_ratio)==null?void 0:v.toFixed(2))||"--"}</div>
          <div class="bm-label">Sharpe Ratio</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value" style="color:var(--red)">${(a.max_drawdown*100).toFixed(2)}%</div>
          <div class="bm-label">Max Drawdown</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${(a.win_rate*100).toFixed(0)}%</div>
          <div class="bm-label">Win Rate</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${a.total_trades}</div>
          <div class="bm-label">Total Trades</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${((r=a.profit_factor)==null?void 0:r.toFixed(2))||"--"}</div>
          <div class="bm-label">Profit Factor</div>
        </div>
      </div>
    </div>
    <div class="bt-trades">
      <h3>Trade Log</h3>
      ${(a.trades||[]).map(o=>`
        <div class="trade-item">
          <span class="trade-action ${o.action}">${o.action}</span>
          <span class="trade-date">${o.timestamp}</span>
          <span class="trade-price">$${Number(o.price).toLocaleString()}</span>
          <span class="trade-reason">${o.reason||""}</span>
        </div>
      `).join("")||'<div style="color:var(--text-muted);padding:12px">No trades executed</div>'}
    </div>
  `});async function j(){var s,i,a;const t=document.getElementById("risk-layout");t.innerHTML='<div class="loading-state"><div class="spinner"></div> Calculating risk metrics...</div>';const e=await $("/market/accuracy"),n=await $("/market/regime");t.className="risk-layout active",t.innerHTML=`
    <div class="risk-card">
      <h4>Market Regime</h4>
      <div class="risk-value" style="color:var(--accent)">${((i=(s=n==null?void 0:n.current)==null?void 0:s.regime)==null?void 0:i.replace("_"," "))||"Unknown"}</div>
      <div class="risk-sub">Confidence: ${(a=n==null?void 0:n.current)!=null&&a.confidence?(n.current.confidence*100).toFixed(0)+"%":"--"}</div>
    </div>
    <div class="risk-card">
      <h4>Model Accuracy</h4>
      ${e!=null&&e.models?Object.entries(e.models).map(([d,v])=>`
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem">
          <span>${d}</span>
          <span style="font-family:var(--mono);font-weight:600;color:${v.directional_accuracy>.5?"var(--green)":"var(--red)"}">
            ${(v.directional_accuracy*100).toFixed(0)}%
          </span>
        </div>
      `).join(""):'<div class="risk-sub">No accuracy data yet — predictions need time to mature</div>'}
    </div>
    <div class="risk-card">
      <h4>Predictions Evaluated</h4>
      <div class="risk-value">${(e==null?void 0:e.total_evaluated)||0}</div>
      <div class="risk-sub">Total predictions scored against actuals</div>
    </div>
    <div class="risk-card">
      <h4>Regime History</h4>
      ${((n==null?void 0:n.history)||[]).slice(0,5).map(d=>{var v,r;return`
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.8rem">
          <span style="color:var(--text-dim)">${((v=d.timestamp)==null?void 0:v.substring(0,10))||"--"}</span>
          <span style="font-weight:600">${((r=d.regime)==null?void 0:r.replace("_"," "))||"--"}</span>
        </div>
      `}).join("")||'<div class="risk-sub">No regime history</div>'}
    </div>
  `}async function D(){var n;const t=document.getElementById("opportunities-layout");t.innerHTML='<div class="loading-state"><div class="spinner"></div> Scanning global opportunities...</div>';const e=await $("/market/opportunities");if(t.className="opportunities-layout active",!((n=e==null?void 0:e.opportunities)!=null&&n.length)){t.innerHTML=`
      <div class="opp-matrix">
        ${z()}
      </div>
    `;return}t.innerHTML=`
    <div class="opp-matrix">
      ${e.opportunities.map(s=>`
        <div class="opp-card">
          <div class="opp-score">${(s.opportunity_score*100).toFixed(0)}</div>
          <div class="opp-sector">${s.sector||"Multi-sector"}</div>
          <div class="opp-geo">${s.geography||"Global"}</div>
          <div class="opp-thesis">${s.description||"Opportunity identified by multi-factor scoring"}</div>
        </div>
      `).join("")}
    </div>
  `}function z(){return[{sector:"Technology",geo:"United States",score:.82,thesis:"Strong momentum in AI/semiconductor sector. RSI not yet overbought. Macro tailwinds from easing monetary policy."},{sector:"Healthcare",geo:"India",score:.76,thesis:"Population growth + rising middle class driving healthcare demand. Attractive valuations vs developed markets."},{sector:"Energy",geo:"Brazil",score:.71,thesis:"Renewable energy transition creating opportunities. Strong GDP growth and FDI inflows."},{sector:"Financial",geo:"Germany",score:.68,thesis:"European banking consolidation. Higher rate environment boosting net interest margins."},{sector:"Consumer Discretionary",geo:"China",score:.64,thesis:"Post-reopening consumer recovery. E-commerce penetration still growing."},{sector:"Industrial",geo:"Japan",score:.61,thesis:"Yen weakness driving export competitiveness. Infrastructure spending cycle."}].map(e=>`
    <div class="opp-card">
      <div class="opp-score">${(e.score*100).toFixed(0)}</div>
      <div class="opp-sector">${e.sector}</div>
      <div class="opp-geo">${e.geo}</div>
      <div class="opp-thesis">${e.thesis}</div>
      <div class="opp-tags">
        <span class="opp-tag strength">Growth</span>
        <span class="opp-tag strength">Momentum</span>
        <span class="opp-tag risk">Volatility</span>
      </div>
    </div>
  `).join("")}document.getElementById("btn-add-symbol").addEventListener("click",async()=>{const t=document.getElementById("symbol-search"),e=t.value.trim().toUpperCase();e&&(await x("/market/track",{action:"add",symbol:e}),t.value="",b.symbols.push(e),B(b.symbols),_())});document.getElementById("btn-refresh-data").addEventListener("click",async()=>{const t=document.getElementById("btn-refresh-data");t.disabled=!0,t.innerHTML='<div class="spinner"></div>',await x("/market/ingest",{symbols:b.symbols}),t.disabled=!1,t.textContent="Refresh Data",_()});F();w();setInterval(()=>{document.querySelector('[data-tab="globe"].active')&&w()},6e4);
