/**
 * RESONANT SOLVER — Main Application
 *
 * The loop:
 * 1. Compute E(x) and ∇E(x)
 * 2. Update x (gradient descent)
 * 3. Map to sound parameters
 * 4. Update audio engine
 * 5. Draw visualization
 * 6. Repeat
 */

import { ResonantSolver, PROBLEMS } from './solver.js';
import { ResonantAudio } from './audio.js';

const solver = new ResonantSolver();
const audio = new ResonantAudio();

let running = false;
let paused = false;
let currentProblemId = 'single';
let animFrame = null;
let stepInterval = null;
let stepsPerSec = 30;
let celebrated = false;

// ===== DOM =====
const $ = id => document.getElementById(id);

// ===== PROBLEM TABS =====
function renderProblemTabs() {
  const container = $('problem-tabs');
  container.innerHTML = Object.entries(PROBLEMS).map(([id, p]) =>
    `<button class="prob-tab${id === currentProblemId ? ' active' : ''}" data-id="${id}">${p.name}</button>`
  ).join('');
  container.querySelectorAll('.prob-tab').forEach(tab => {
    tab.addEventListener('click', () => selectProblem(tab.dataset.id));
  });
}

function selectProblem(id) {
  currentProblemId = id;
  const p = PROBLEMS[id];
  $('problem-name').textContent = p.name;
  $('problem-eq').textContent = p.description;
  $('problem-detail').textContent = p.detail;
  document.querySelectorAll('.prob-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.id === id)
  );

  // Define problem in solver
  solver.define(p.numVars, p.error, p.gradient || null, p.init());
  celebrated = false;

  // Rebuild variable monitors
  renderVarGrid();
  updateDisplay();

  // Reinit audio if voice count changed
  if (running) {
    audio.init(p.numVars).then(() => {
      const params = solver.getSoundParams();
      audio.update(params);
    });
  }
}

// ===== VARIABLE MONITORS =====
function renderVarGrid() {
  const grid = $('var-grid');
  const names = ['x', 'y', 'z', 'w', 'v', 'u'];
  grid.innerHTML = solver.vars.map((_, i) => `
    <div class="var-card" id="var-card-${i}">
      <div class="var-header">
        <span class="var-name">${names[i] || `x${i}`}</span>
        <span class="var-value" id="var-val-${i}">0.00</span>
      </div>
      <div class="var-bars">
        <div class="var-bar-row">
          <span class="var-bar-label">FREQ</span>
          <div class="var-bar"><div class="var-fill" id="var-freq-${i}" style="width:50%;background:var(--cyan)"></div></div>
        </div>
        <div class="var-bar-row">
          <span class="var-bar-label">AMP</span>
          <div class="var-bar"><div class="var-fill" id="var-amp-${i}" style="width:0%;background:var(--green)"></div></div>
        </div>
        <div class="var-bar-row">
          <span class="var-bar-label">VIB</span>
          <div class="var-bar"><div class="var-fill" id="var-vib-${i}" style="width:80%;background:var(--yellow)"></div></div>
        </div>
        <div class="var-bar-row">
          <span class="var-bar-label">NOISE</span>
          <div class="var-bar"><div class="var-fill" id="var-noise-${i}" style="width:80%;background:var(--red)"></div></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== UPDATE DISPLAY =====
function updateDisplay() {
  const params = solver.getSoundParams();

  // State cards
  const errStr = params.error < 0.001 ? params.error.toExponential(1) : params.error.toFixed(3);
  const gradStr = params.gradMagnitude < 0.001 ? params.gradMagnitude.toExponential(1) : params.gradMagnitude.toFixed(3);
  $('state-error').textContent = errStr;
  $('state-error').style.color = params.error < 0.01 ? 'var(--green)' : params.error < 1 ? 'var(--yellow)' : 'var(--red)';
  $('state-grad').textContent = gradStr;
  $('state-grad').style.color = params.gradMagnitude < 0.1 ? 'var(--green)' : params.gradMagnitude < 5 ? 'var(--yellow)' : 'var(--red)';
  $('state-step').textContent = params.step;

  if (params.converged) {
    $('state-status').textContent = 'CONVERGED ✓';
    $('state-status').style.color = 'var(--green)';
    document.querySelector('.viz-section')?.classList.add('converged');
    $('btn-start')?.classList.add('btn-converged');
    $('btn-start')?.classList.remove('running');
  } else if (running && !paused) {
    $('state-status').textContent = 'SOLVING...';
    $('state-status').style.color = 'var(--cyan)';
    document.querySelector('.viz-section')?.classList.remove('converged');
  } else {
    $('state-status').textContent = paused ? 'PAUSED' : 'READY';
    $('state-status').style.color = 'var(--dim)';
    document.querySelector('.viz-section')?.classList.remove('converged');
  }

  // Variable monitors
  for (let i = 0; i < params.vars.length; i++) {
    const valEl = $(`var-val-${i}`);
    if (valEl) valEl.textContent = params.vars[i].toFixed(3);

    // Frequency bar (normalized to 20-2000 Hz range)
    const freqPct = Math.min(100, Math.max(0, ((params.frequencies[i] - 20) / 1980) * 100));
    const freqEl = $(`var-freq-${i}`);
    if (freqEl) freqEl.style.width = `${freqPct}%`;

    // Amplitude bar
    const ampPct = Math.min(100, params.amplitudes[i] * 100);
    const ampEl = $(`var-amp-${i}`);
    if (ampEl) ampEl.style.width = `${ampPct}%`;

    // Vibrato bar (normalized: 0 = no vibrato, 50 = max)
    const vibPct = Math.min(100, (params.vibratos[i] / 50) * 100);
    const vibEl = $(`var-vib-${i}`);
    if (vibEl) vibEl.style.width = `${vibPct}%`;

    // Noise bar
    const noisePct = Math.min(100, params.noises[i] * 100);
    const noiseEl = $(`var-noise-${i}`);
    if (noiseEl) noiseEl.style.width = `${noisePct}%`;
  }
}

// ===== WAVEFORM =====
function drawWaveform() {
  const canvas = $('waveform');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  const analyser = audio.getAnalyser();
  if (!analyser) {
    // Draw flat line when not running
    ctx.strokeStyle = 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    return;
  }

  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(buf);

  // Color based on error
  const err = solver.error;
  const r = Math.min(255, err * 60);
  const g = Math.min(255, Math.max(0, (1 - err / 5) * 200));
  const b = Math.min(255, Math.max(0, (1 - err / 10) * 255));
  ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  const step = W / buf.length;
  for (let i = 0; i < buf.length; i++) {
    const x = i * step;
    const y = (buf[i] / 128 - 1) * H * 0.4 + H / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (running && !paused) animFrame = requestAnimationFrame(drawWaveform);
}

// ===== ERROR HISTORY CHART =====
function drawErrorChart() {
  const canvas = $('error-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  const history = solver.history;
  if (history.length < 2) return;

  ctx.clearRect(0, 0, W, H);

  // Use log scale for error
  const logHist = history.map(e => Math.log10(Math.max(1e-6, e)));
  const minLog = Math.min(...logHist);
  const maxLog = Math.max(...logHist);
  const range = maxLog - minLog || 1;

  ctx.strokeStyle = 'rgba(0,229,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const maxPoints = Math.min(history.length, W);
  const skip = Math.max(1, Math.floor(history.length / maxPoints));

  for (let i = 0; i < history.length; i += skip) {
    const x = (i / (history.length - 1)) * W;
    const y = H - ((logHist[i] - minLog) / range) * H * 0.85 - H * 0.08;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Labels
  ctx.fillStyle = 'rgba(100,116,139,0.5)';
  ctx.font = '9px monospace';
  ctx.fillText(`E = ${history[history.length - 1].toExponential(2)}`, 4, 12);
  ctx.fillText(`log₁₀(E)`, W - 50, 12);
}

// ===== OPTIMIZATION STEP =====
function optimizationStep() {
  if (!running || paused) return;

  solver.step_();
  const params = solver.getSoundParams();
  audio.update(params);
  updateDisplay();
  drawErrorChart();

  // Celebrate convergence once
  if (params.converged && !celebrated) {
    celebrated = true;
    audio.celebrate();
    clearInterval(stepInterval);
    running = false;
    $('btn-start').textContent = '✓ CONVERGED';
    $('btn-start').classList.add('btn-converged');
    $('btn-start').classList.remove('running');
  }
}

// ===== START / STOP / RESET =====
async function start() {
  if (running && !paused) return;

  const p = PROBLEMS[currentProblemId];
  await audio.init(p.numVars);

  running = true;
  paused = false;
  celebrated = false;
  // Use problem-specific lr if defined, otherwise slider value
  const problemLr = PROBLEMS[currentProblemId].lr;
  if (problemLr) {
    solver.lr = problemLr;
    $('lr-slider').value = problemLr;
    $('lr-val').textContent = problemLr.toFixed(3);
  } else {
    solver.lr = parseFloat($('lr-slider')?.value || 0.01);
  }

  $('btn-start').textContent = '▶ RUNNING';
  $('btn-start').classList.add('running');
  $('btn-start').classList.remove('btn-converged');

  // Start optimization loop
  clearInterval(stepInterval);
  stepsPerSec = parseInt($('speed-slider')?.value || 30);
  stepInterval = setInterval(optimizationStep, 1000 / stepsPerSec);

  // Start waveform drawing
  drawWaveform();
}

function pause() {
  paused = !paused;
  if (paused) {
    $('btn-pause').textContent = '▶ RESUME';
    $('btn-start').textContent = '⏸ PAUSED';
    $('btn-start').classList.remove('running');
  } else {
    $('btn-pause').textContent = '⏸ PAUSE';
    $('btn-start').textContent = '▶ RUNNING';
    $('btn-start').classList.add('running');
    drawWaveform();
  }
  updateDisplay();
}

function reset() {
  clearInterval(stepInterval);
  running = false;
  paused = false;
  celebrated = false;

  audio.stop();

  const p = PROBLEMS[currentProblemId];
  solver.define(p.numVars, p.error, p.gradient || null, p.init());
  renderVarGrid();
  updateDisplay();
  drawErrorChart();

  $('btn-start').textContent = '▶ START';
  $('btn-start').classList.remove('running', 'btn-converged');
  $('btn-pause').textContent = '⏸ PAUSE';

  // Clear waveform
  const canvas = $('waveform');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ===== INIT =====
function init() {
  renderProblemTabs();
  selectProblem('single');

  $('btn-start')?.addEventListener('click', start);
  $('btn-pause')?.addEventListener('click', pause);
  $('btn-reset')?.addEventListener('click', reset);

  $('lr-slider')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    solver.lr = v;
    $('lr-val').textContent = v.toFixed(3);
  });

  $('speed-slider')?.addEventListener('input', e => {
    stepsPerSec = parseInt(e.target.value);
    $('speed-val').textContent = stepsPerSec;
    if (running && !paused) {
      clearInterval(stepInterval);
      stepInterval = setInterval(optimizationStep, 1000 / stepsPerSec);
    }
  });

  $('vol-slider')?.addEventListener('input', e => {
    audio.setVolume(parseFloat(e.target.value));
  });
}

document.addEventListener('DOMContentLoaded', init);
