/**
 * THE WORLD — Market Intelligence Engine Frontend
 *
 * Connects to the Python MarketEngine backend at localhost:8000
 * Renders: globe, live markets, predictions, AI debates, backtests, risk, opportunities
 */

const API = 'http://localhost:8000';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  symbols: [],
  predictions: {},
  dashboard: null,
  regime: null,
};

// ── Tab Navigation ───────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    const viewId = `view-${tab.dataset.tab}`;
    document.getElementById(viewId)?.classList.add('active');

    // Load data for the view
    switch (tab.dataset.tab) {
      case 'globe': loadDashboard(); break;
      case 'markets': loadMarkets(); break;
      case 'risk': loadRisk(); break;
      case 'opportunities': loadOpportunities(); break;
    }
  });
});

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return await res.json();
  } catch (e) {
    console.warn(`API error: ${path}`, e);
    return null;
  }
}

async function apiPost(path, body) {
  return api(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Globe View ───────────────────────────────────────────────────────────────
function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
  }
  resize();
  window.addEventListener('resize', resize);

  let rotation = 0;
  const markets = [
    { name: 'NYSE', lat: 40.7, lon: -74, color: '#6366f1' },
    { name: 'NASDAQ', lat: 37.4, lon: -122, color: '#22d3ee' },
    { name: 'LSE', lat: 51.5, lon: -0.1, color: '#a855f7' },
    { name: 'TSE', lat: 35.7, lon: 139.7, color: '#f59e0b' },
    { name: 'SSE', lat: 31.2, lon: 121.5, color: '#ef4444' },
    { name: 'BSE', lat: 19.1, lon: 72.9, color: '#10b981' },
    { name: 'FSE', lat: 50.1, lon: 8.7, color: '#8b5cf6' },
    { name: 'BM&F', lat: -23.5, lon: -46.6, color: '#06b6d4' },
  ];

  function draw() {
    const w = canvas.width / 2;
    const h = canvas.height / 2;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) * 0.65;

    ctx.clearRect(0, 0, w, h);

    // Globe background
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a15');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#2a2a4d';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grid lines (longitude)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + rotation;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(Math.cos(angle)) * r, r, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Grid lines (latitude)
    for (let i = 1; i < 6; i++) {
      const y = cy - r + (2 * r * i) / 6;
      const rx = Math.sqrt(r * r - (y - cy) * (y - cy));
      ctx.beginPath();
      ctx.ellipse(cx, y, rx, rx * 0.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Market dots
    markets.forEach(m => {
      const lon = (m.lon / 180) * Math.PI + rotation;
      const lat = (m.lat / 180) * Math.PI;

      const x3d = Math.cos(lat) * Math.sin(lon);
      const z3d = Math.cos(lat) * Math.cos(lon);
      const y3d = Math.sin(lat);

      if (z3d < -0.1) return; // behind globe

      const px = cx + x3d * r;
      const py = cy - y3d * r;
      const alpha = 0.4 + z3d * 0.6;
      const dotR = 3 + z3d * 3;

      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, dotR * 4);
      glow.addColorStop(0, m.color + '40');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, dotR * 4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      if (z3d > 0.3) {
        ctx.fillStyle = '#888';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(m.name, px + dotR + 4, py + 3);
      }
    });

    // Connection lines between markets
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const a = markets[i], b = markets[j];
        const lonA = (a.lon / 180) * Math.PI + rotation;
        const latA = (a.lat / 180) * Math.PI;
        const lonB = (b.lon / 180) * Math.PI + rotation;
        const latB = (b.lat / 180) * Math.PI;

        const zA = Math.cos(latA) * Math.cos(lonA);
        const zB = Math.cos(latB) * Math.cos(lonB);

        if (zA < 0 || zB < 0) continue;

        const xA = cx + Math.cos(latA) * Math.sin(lonA) * r;
        const yA = cy - Math.sin(latA) * r;
        const xB = cx + Math.cos(latB) * Math.sin(lonB) * r;
        const yB = cy - Math.sin(latB) * r;

        const dist = Math.sqrt((xA - xB) ** 2 + (yA - yB) ** 2);
        if (dist > r * 1.5) continue;

        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xB, yB);
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.04 + zA * zB * 0.06})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    rotation += 0.003;
    requestAnimationFrame(draw);
  }

  draw();
}

async function loadDashboard() {
  const data = await api('/market/dashboard');
  if (!data) {
    // Show demo data when backend isn't running
    renderDemoDashboard();
    return;
  }

  state.dashboard = data;
  state.symbols = data.tracked_symbols || [];

  // Update header
  if (data.regime) {
    const badge = document.getElementById('regime-badge');
    const label = document.getElementById('regime-label');
    const regime = data.regime?.regime || 'loading';
    label.textContent = regime.replace('_', ' ');
    badge.className = 'regime-badge ' + (regime.includes('bull') ? 'bull' : regime.includes('bear') ? 'bear' : '');
  }

  if (data.last_update) {
    document.getElementById('last-update').textContent =
      new Date(data.last_update).toLocaleTimeString();
  }

  // Globe stats
  document.getElementById('globe-symbols').textContent = data.tracked_symbols?.length || '--';
  document.getElementById('globe-predictions').textContent =
    Object.keys(data.predictions || {}).length;
  document.getElementById('globe-countries').textContent = '7';

  // Ticker cards
  renderTicker(data.predictions || {});

  // Populate symbol dropdowns
  populateSymbolDropdowns(data.tracked_symbols || []);
}

function renderDemoDashboard() {
  const demoSymbols = ['^GSPC', '^IXIC', 'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'BTC-USD', 'GC=F'];
  const demoPredictions = {};
  demoSymbols.forEach(s => {
    const dir = Math.random() > 0.5 ? 'up' : 'down';
    demoPredictions[s] = {
      direction: dir,
      confidence: +(0.4 + Math.random() * 0.4).toFixed(2),
      predicted_return: +((Math.random() - 0.5) * 0.04).toFixed(4),
      current_price: +(1000 + Math.random() * 5000).toFixed(2),
    };
  });

  document.getElementById('globe-symbols').textContent = demoSymbols.length;
  document.getElementById('globe-predictions').textContent = demoSymbols.length;
  document.getElementById('globe-countries').textContent = '7';
  document.getElementById('regime-label').textContent = 'Sideways';

  renderTicker(demoPredictions);
  populateSymbolDropdowns(demoSymbols);
  state.symbols = demoSymbols;
  state.predictions = demoPredictions;
}

function renderTicker(predictions) {
  const container = document.getElementById('market-ticker');
  container.innerHTML = Object.entries(predictions).map(([sym, p]) => {
    const changeClass = p.direction === 'up' ? 'up' : p.direction === 'down' ? 'down' : 'flat';
    const arrow = p.direction === 'up' ? '▲' : p.direction === 'down' ? '▼' : '—';
    const returnPct = p.predicted_return != null ? (p.predicted_return * 100).toFixed(2) + '%' : '--';
    return `
      <div class="ticker-card" onclick="navigateToPredict('${sym}')">
        <div>
          <div class="ticker-symbol">${sym}</div>
          <div class="ticker-price">${p.current_price ? '$' + Number(p.current_price).toLocaleString() : '--'}</div>
        </div>
        <div>
          <div class="ticker-change ${changeClass}">${arrow} ${returnPct}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-align:right">${(p.confidence * 100).toFixed(0)}% conf</div>
        </div>
      </div>
    `;
  }).join('');
}

function populateSymbolDropdowns(symbols) {
  ['predict-symbol', 'debate-symbol', 'bt-symbol'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = symbols.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

window.navigateToPredict = function(sym) {
  document.querySelector('[data-tab="predict"]').click();
  document.getElementById('predict-symbol').value = sym;
};

// ── Markets View ─────────────────────────────────────────────────────────────
async function loadMarkets() {
  const grid = document.getElementById('markets-grid');
  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div> Loading market data...</div>';

  const symbols = state.symbols.length ? state.symbols :
    ['^GSPC', '^IXIC', 'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'BTC-USD', 'GC=F'];

  const cards = [];
  for (const sym of symbols) {
    const features = await api(`/market/features/${sym}`);
    if (features) {
      cards.push(renderMarketCard(sym, features));
    } else {
      cards.push(renderMarketCardDemo(sym));
    }
  }
  grid.innerHTML = cards.join('');
}

function renderMarketCard(sym, f) {
  const price = f.tech_current_price || '--';
  const rsi = f.tech_rsi_14 || '--';
  const vol = f.tech_volatility_21d ? (f.tech_volatility_21d * 100).toFixed(1) + '%' : '--';
  const ret = f.tech_return_21d ? (f.tech_return_21d * 100).toFixed(2) + '%' : '--';
  const macd = f.tech_macd || '--';
  const zscore = f.tech_zscore_50 || '--';
  const pe = f.fund_pe_ratio || '--';
  const beta = f.fund_beta || '--';

  return `
    <div class="market-card">
      <div class="market-card-header">
        <div>
          <div class="market-card-symbol">${sym}</div>
        </div>
        <div class="market-card-price">$${Number(price).toLocaleString()}</div>
      </div>
      <div class="market-card-indicators">
        <div class="indicator"><span class="indicator-label">RSI(14)</span><span class="indicator-value">${rsi}</span></div>
        <div class="indicator"><span class="indicator-label">Volatility</span><span class="indicator-value">${vol}</span></div>
        <div class="indicator"><span class="indicator-label">21d Return</span><span class="indicator-value">${ret}</span></div>
        <div class="indicator"><span class="indicator-label">MACD</span><span class="indicator-value">${macd}</span></div>
        <div class="indicator"><span class="indicator-label">Z-Score</span><span class="indicator-value">${zscore}</span></div>
        <div class="indicator"><span class="indicator-label">P/E</span><span class="indicator-value">${pe}</span></div>
        <div class="indicator"><span class="indicator-label">Beta</span><span class="indicator-value">${beta}</span></div>
      </div>
    </div>
  `;
}

function renderMarketCardDemo(sym) {
  return `
    <div class="market-card">
      <div class="market-card-header">
        <div class="market-card-symbol">${sym}</div>
        <div class="market-card-price" style="color:var(--text-muted)">--</div>
      </div>
      <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.8rem">
        Start the backend to load live data
      </div>
    </div>
  `;
}

// ── Prediction View ──────────────────────────────────────────────────────────
document.getElementById('btn-predict').addEventListener('click', async () => {
  const sym = document.getElementById('predict-symbol').value;
  const horizon = document.getElementById('predict-horizon').value;
  const btn = document.getElementById('btn-predict');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  document.getElementById('predict-result').innerHTML =
    '<div class="loading-state"><div class="spinner"></div> Running ensemble prediction...</div>';

  const data = await apiPost('/market/predict', { symbol: sym, horizon: parseInt(horizon) });

  btn.disabled = false;
  btn.textContent = 'Run Prediction';

  if (!data || data.error) {
    document.getElementById('predict-result').innerHTML =
      `<div class="empty-state">Error: ${data?.error || 'Backend not running. Start the market engine.'}</div>`;
    return;
  }

  renderPrediction(data);
});

function renderPrediction(data) {
  const ens = data.ensemble || {};
  const dir = ens.direction || 'flat';
  const conf = ens.confidence || 0;
  const ret = ens.predicted_return || 0;
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
  const confColor = dir === 'up' ? 'var(--green)' : dir === 'down' ? 'var(--red)' : 'var(--accent)';

  document.getElementById('predict-result').innerHTML = `
    <div class="predict-direction">
      <div class="direction-arrow ${dir}">${arrow}</div>
      <div class="direction-text">
        <h3 style="color:${confColor}">${dir.toUpperCase()}</h3>
        <div style="color:var(--text-dim);font-size:0.85rem">${data.symbol} · ${(conf * 100).toFixed(1)}% confidence</div>
      </div>
    </div>
    <div class="confidence-bar">
      <div class="confidence-fill" style="width:${conf * 100}%;background:${confColor}"></div>
    </div>
    <div class="predict-metrics">
      <div class="predict-metric">
        <div class="pm-value" style="color:${confColor}">${(ret * 100).toFixed(2)}%</div>
        <div class="pm-label">Predicted Return</div>
      </div>
      <div class="predict-metric">
        <div class="pm-value">${(conf * 100).toFixed(0)}%</div>
        <div class="pm-label">Confidence</div>
      </div>
      <div class="predict-metric">
        <div class="pm-value">${ens.consensus_strength ? (ens.consensus_strength * 100).toFixed(0) + '%' : '--'}</div>
        <div class="pm-label">Consensus</div>
      </div>
    </div>
  `;

  // Model breakdown
  const models = data.models || {};
  document.getElementById('model-breakdown').innerHTML = Object.entries(models).map(([name, m]) => {
    const mDir = m.direction || 'flat';
    return `
      <div class="model-item">
        <span class="model-name">${name}</span>
        <span class="model-direction ${mDir}">${mDir.toUpperCase()}</span>
        <span class="model-conf">${m.confidence ? (m.confidence * 100).toFixed(0) + '%' : '--'}</span>
      </div>
    `;
  }).join('');

  // Features
  const features = data.features_summary || {};
  document.getElementById('features-grid').innerHTML = Object.entries(features).map(([k, v]) => `
    <div class="feature-item">
      <span class="feature-key">${k.replace('tech_', '').replace('fund_', '').replace('macro_', '')}</span>
      <span class="feature-val">${typeof v === 'number' ? v.toFixed(4) : v}</span>
    </div>
  `).join('');
}

// ── AI Debate View ───────────────────────────────────────────────────────────
document.getElementById('btn-debate').addEventListener('click', async () => {
  const sym = document.getElementById('debate-symbol').value;
  const btn = document.getElementById('btn-debate');
  const layout = document.getElementById('debate-layout');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  layout.innerHTML = '<div class="loading-state"><div class="spinner"></div> Running Bull vs Bear vs Neutral debate...</div>';
  layout.className = 'debate-layout';

  const data = await apiPost(`/market/debate/${sym}`, {});

  btn.disabled = false;
  btn.textContent = 'Start Debate';

  if (!data || data.error) {
    layout.innerHTML = `<div class="empty-state">Error: ${data?.error || 'Backend not running'}</div>`;
    return;
  }

  layout.className = 'debate-layout active';
  layout.innerHTML = `
    <div class="debate-agent bull">
      <div class="agent-header">
        <div class="agent-icon">📈</div>
        <div class="agent-name">Bull Analyst</div>
      </div>
      <div class="agent-text">${data.bull || 'No response'}</div>
    </div>
    <div class="debate-agent bear">
      <div class="agent-header">
        <div class="agent-icon">📉</div>
        <div class="agent-name">Bear Analyst</div>
      </div>
      <div class="agent-text">${data.bear || 'No response'}</div>
    </div>
    <div class="debate-agent neutral">
      <div class="agent-header">
        <div class="agent-icon">📊</div>
        <div class="agent-name">Quant Analyst</div>
      </div>
      <div class="agent-text">${data.neutral || 'No response'}</div>
    </div>
    <div class="debate-synthesis">
      <div class="synthesis-header">Synthesis</div>
      <div class="synthesis-text">${data.synthesis || 'No synthesis available'}</div>
      <div class="synthesis-meta">
        <span>Consensus: <strong style="color:var(--accent)">${data.consensus_direction || '--'}</strong></span>
        <span>Conviction: <strong>${data.conviction_level ? (data.conviction_level * 100).toFixed(0) + '%' : '--'}</strong></span>
        ${data.actionable_insight ? `<span>Action: <strong>${data.actionable_insight}</strong></span>` : ''}
      </div>
    </div>
  `;
});

// ── Backtest View ────────────────────────────────────────────────────────────
document.getElementById('btn-backtest').addEventListener('click', async () => {
  const strategy = document.getElementById('bt-strategy').value;
  const symbol = document.getElementById('bt-symbol').value;
  const capital = document.getElementById('bt-capital').value;
  const btn = document.getElementById('btn-backtest');
  const container = document.getElementById('backtest-result');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div> Running walk-forward backtest...</div>';
  container.className = 'backtest-result';

  const data = await apiPost('/market/backtest', {
    strategy, symbol, initial_capital: parseInt(capital),
  });

  btn.disabled = false;
  btn.textContent = 'Run Backtest';

  if (!data || data.error) {
    container.innerHTML = `<div class="empty-state">Error: ${data?.error || 'Backend not running'}</div>`;
    return;
  }

  container.className = 'backtest-result active';
  const retColor = data.total_return >= 0 ? 'var(--green)' : 'var(--red)';

  container.innerHTML = `
    <div class="bt-metrics">
      <h3>Performance Metrics</h3>
      <div class="bt-metric-grid">
        <div class="bt-metric">
          <div class="bm-value" style="color:${retColor}">${(data.total_return * 100).toFixed(2)}%</div>
          <div class="bm-label">Total Return</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${data.sharpe_ratio?.toFixed(2) || '--'}</div>
          <div class="bm-label">Sharpe Ratio</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value" style="color:var(--red)">${(data.max_drawdown * 100).toFixed(2)}%</div>
          <div class="bm-label">Max Drawdown</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${(data.win_rate * 100).toFixed(0)}%</div>
          <div class="bm-label">Win Rate</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${data.total_trades}</div>
          <div class="bm-label">Total Trades</div>
        </div>
        <div class="bt-metric">
          <div class="bm-value">${data.profit_factor?.toFixed(2) || '--'}</div>
          <div class="bm-label">Profit Factor</div>
        </div>
      </div>
    </div>
    <div class="bt-trades">
      <h3>Trade Log</h3>
      ${(data.trades || []).map(t => `
        <div class="trade-item">
          <span class="trade-action ${t.action}">${t.action}</span>
          <span class="trade-date">${t.timestamp}</span>
          <span class="trade-price">$${Number(t.price).toLocaleString()}</span>
          <span class="trade-reason">${t.reason || ''}</span>
        </div>
      `).join('') || '<div style="color:var(--text-muted);padding:12px">No trades executed</div>'}
    </div>
  `;
});

// ── Risk View ────────────────────────────────────────────────────────────────
async function loadRisk() {
  const layout = document.getElementById('risk-layout');
  layout.innerHTML = '<div class="loading-state"><div class="spinner"></div> Calculating risk metrics...</div>';

  const accuracy = await api('/market/accuracy');
  const regime = await api('/market/regime');

  layout.className = 'risk-layout active';
  layout.innerHTML = `
    <div class="risk-card">
      <h4>Market Regime</h4>
      <div class="risk-value" style="color:var(--accent)">${regime?.current?.regime?.replace('_', ' ') || 'Unknown'}</div>
      <div class="risk-sub">Confidence: ${regime?.current?.confidence ? (regime.current.confidence * 100).toFixed(0) + '%' : '--'}</div>
    </div>
    <div class="risk-card">
      <h4>Model Accuracy</h4>
      ${accuracy?.models ? Object.entries(accuracy.models).map(([name, m]) => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem">
          <span>${name}</span>
          <span style="font-family:var(--mono);font-weight:600;color:${m.directional_accuracy > 0.5 ? 'var(--green)' : 'var(--red)'}">
            ${(m.directional_accuracy * 100).toFixed(0)}%
          </span>
        </div>
      `).join('') : '<div class="risk-sub">No accuracy data yet — predictions need time to mature</div>'}
    </div>
    <div class="risk-card">
      <h4>Predictions Evaluated</h4>
      <div class="risk-value">${accuracy?.total_evaluated || 0}</div>
      <div class="risk-sub">Total predictions scored against actuals</div>
    </div>
    <div class="risk-card">
      <h4>Regime History</h4>
      ${(regime?.history || []).slice(0, 5).map(r => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.8rem">
          <span style="color:var(--text-dim)">${r.timestamp?.substring(0, 10) || '--'}</span>
          <span style="font-weight:600">${r.regime?.replace('_', ' ') || '--'}</span>
        </div>
      `).join('') || '<div class="risk-sub">No regime history</div>'}
    </div>
  `;
}

// ── Opportunities View ───────────────────────────────────────────────────────
async function loadOpportunities() {
  const layout = document.getElementById('opportunities-layout');
  layout.innerHTML = '<div class="loading-state"><div class="spinner"></div> Scanning global opportunities...</div>';

  const data = await api('/market/opportunities');

  layout.className = 'opportunities-layout active';

  if (!data?.opportunities?.length) {
    // Show demo opportunities
    layout.innerHTML = `
      <div class="opp-matrix">
        ${renderDemoOpportunities()}
      </div>
    `;
    return;
  }

  layout.innerHTML = `
    <div class="opp-matrix">
      ${data.opportunities.map(o => `
        <div class="opp-card">
          <div class="opp-score">${(o.opportunity_score * 100).toFixed(0)}</div>
          <div class="opp-sector">${o.sector || 'Multi-sector'}</div>
          <div class="opp-geo">${o.geography || 'Global'}</div>
          <div class="opp-thesis">${o.description || 'Opportunity identified by multi-factor scoring'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDemoOpportunities() {
  const demos = [
    { sector: 'Technology', geo: 'United States', score: 0.82, thesis: 'Strong momentum in AI/semiconductor sector. RSI not yet overbought. Macro tailwinds from easing monetary policy.' },
    { sector: 'Healthcare', geo: 'India', score: 0.76, thesis: 'Population growth + rising middle class driving healthcare demand. Attractive valuations vs developed markets.' },
    { sector: 'Energy', geo: 'Brazil', score: 0.71, thesis: 'Renewable energy transition creating opportunities. Strong GDP growth and FDI inflows.' },
    { sector: 'Financial', geo: 'Germany', score: 0.68, thesis: 'European banking consolidation. Higher rate environment boosting net interest margins.' },
    { sector: 'Consumer Discretionary', geo: 'China', score: 0.64, thesis: 'Post-reopening consumer recovery. E-commerce penetration still growing.' },
    { sector: 'Industrial', geo: 'Japan', score: 0.61, thesis: 'Yen weakness driving export competitiveness. Infrastructure spending cycle.' },
  ];

  return demos.map(d => `
    <div class="opp-card">
      <div class="opp-score">${(d.score * 100).toFixed(0)}</div>
      <div class="opp-sector">${d.sector}</div>
      <div class="opp-geo">${d.geo}</div>
      <div class="opp-thesis">${d.thesis}</div>
      <div class="opp-tags">
        <span class="opp-tag strength">Growth</span>
        <span class="opp-tag strength">Momentum</span>
        <span class="opp-tag risk">Volatility</span>
      </div>
    </div>
  `).join('');
}

// ── Add Symbol ───────────────────────────────────────────────────────────────
document.getElementById('btn-add-symbol').addEventListener('click', async () => {
  const input = document.getElementById('symbol-search');
  const sym = input.value.trim().toUpperCase();
  if (!sym) return;

  await apiPost('/market/track', { action: 'add', symbol: sym });
  input.value = '';
  state.symbols.push(sym);
  populateSymbolDropdowns(state.symbols);
  loadMarkets();
});

document.getElementById('btn-refresh-data').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh-data');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  await apiPost('/market/ingest', { symbols: state.symbols });
  btn.disabled = false;
  btn.textContent = 'Refresh Data';
  loadMarkets();
});

// ── Init ─────────────────────────────────────────────────────────────────────
initGlobe();
loadDashboard();

// Auto-refresh every 60 seconds
setInterval(() => {
  if (document.querySelector('[data-tab="globe"].active')) {
    loadDashboard();
  }
}, 60000);
