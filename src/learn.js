/**
 * STYLE LEARNER — Controller
 *
 * 8-voice audio system: each dimension of code style becomes one oscillator voice.
 * Perfect match   → loud, pure sine (consonant partial of A2 harmonic series)
 * Deviation       → quiet, noisy, vibrato (dissonant)
 * All matching    → rich A2 harmonic chord
 * All deviating   → harsh, inharmonic noise
 */

import { StyleEngine, DIMENSION_LABELS, DIMENSION_NAMES, BASE_FREQS } from './style-engine.js';

const engine = new StyleEngine();

// ── State ──────────────────────────────────────────────────────────────────
let currentFingerprint = null;
let lastComparison = null;
let audioCtx = null;
let voices = [];         // 8 oscillator+gain objects
let noiseNodes = [];     // 8 noise sources
let animFrame = null;
let analyser = null;
let isPlaying = false;
let isScanMode = false;
let scanLine = 0;
let scanInterval = null;
let scanSpeed = 4; // lines per second

// ── DOM refs ───────────────────────────────────────────────────────────────
const profileSelect    = document.getElementById('profileSelect');
const profileName      = document.getElementById('profileName');
const saveProfileBtn   = document.getElementById('saveProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');
const trainInput       = document.getElementById('trainInput');
const trainBtn         = document.getElementById('trainBtn');
const mergeBtn         = document.getElementById('mergeBtn');
const trainStatus      = document.getElementById('trainStatus');
const fingerprintSec   = document.getElementById('fingerprintSection');
const radarCanvas      = document.getElementById('radarCanvas');
const dimensionGrid    = document.getElementById('dimensionGrid');
const compareInput     = document.getElementById('compareInput');
const compareBtn       = document.getElementById('compareBtn');
const playBtn          = document.getElementById('playBtn');
const stopBtn          = document.getElementById('stopBtn');
const waveCanvas       = document.getElementById('waveCanvas');
const scoreSection     = document.getElementById('scoreSection');
const scoreCanvas      = document.getElementById('scoreCanvas');
const scoreValue       = document.getElementById('scoreValue');
const dimBars          = document.getElementById('dimBars');
const correctionPanel  = document.getElementById('correctionPanel');
const correctionList   = document.getElementById('correctionList');
const codeView         = document.getElementById('codeView');
const issuesList       = document.getElementById('issuesList');
const issueCount       = document.getElementById('issueCount');
const issuesContent    = document.getElementById('issuesContent');
const autoFixBtn       = document.getElementById('autoFixBtn');
const audioIndicator   = document.getElementById('audioIndicator');
const audioStatus      = document.getElementById('audioStatus');
const voiceBarsEl      = document.getElementById('voiceBars');

// ── Init ───────────────────────────────────────────────────────────────────
init();

function init() {
  buildVoiceBars();
  loadProfileList();
  bindEvents();
}

function buildVoiceBars() {
  voiceBarsEl.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const bar = document.createElement('div');
    bar.className = 'voice-bar';
    bar.id = `vbar-${i}`;
    voiceBarsEl.appendChild(bar);
  }
}

// ── Profile Management ─────────────────────────────────────────────────────
function loadProfileList() {
  const names = engine.listFingerprints();
  profileSelect.innerHTML = '<option value="">— new profile —</option>';
  for (const n of names) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    profileSelect.appendChild(opt);
  }
}

function bindEvents() {
  profileSelect.addEventListener('change', () => {
    const name = profileSelect.value;
    if (!name) { currentFingerprint = null; return; }
    currentFingerprint = engine.loadFingerprint(name);
    profileName.value = name;
    if (currentFingerprint) renderFingerprint(currentFingerprint);
  });

  saveProfileBtn.addEventListener('click', () => {
    const name = profileName.value.trim();
    if (!name) { flash(trainStatus, 'Enter a profile name', 'error'); return; }
    if (!currentFingerprint) { flash(trainStatus, 'Extract fingerprint first', 'error'); return; }
    engine.saveFingerprint(name, currentFingerprint);
    loadProfileList();
    profileSelect.value = name;
    flash(trainStatus, `Saved "${name}"`, 'ok');
  });

  deleteProfileBtn.addEventListener('click', () => {
    const name = profileSelect.value;
    if (!name) return;
    engine.deleteFingerprint(name);
    currentFingerprint = null;
    loadProfileList();
    profileSelect.value = '';
    profileName.value = '';
    fingerprintSec.classList.add('hidden');
    flash(trainStatus, `Deleted "${name}"`, '');
  });

  trainBtn.addEventListener('click', trainFromInput);
  mergeBtn.addEventListener('click', mergeFromInput);
  compareBtn.addEventListener('click', doCompare);
  playBtn.addEventListener('click', startAudio);
  stopBtn.addEventListener('click', () => { stopAudio(); stopScan(); });

  autoFixBtn.addEventListener('click', showSuggestions);

  // Scan mode
  document.getElementById('scanModeBtn')?.addEventListener('click', toggleScanMode);
}

// ── Train ──────────────────────────────────────────────────────────────────
function trainFromInput() {
  const src = trainInput.value.trim();
  if (!src) { flash(trainStatus, 'Paste some code first', 'error'); return; }

  trainBtn.textContent = 'Extracting…';
  trainBtn.disabled = true;

  setTimeout(() => {
    try {
      currentFingerprint = engine.extractFingerprint(src);
      renderFingerprint(currentFingerprint);
      flash(trainStatus, `✓ ${DIMENSION_NAMES.length} dimensions extracted`, 'ok');
    } catch (e) {
      flash(trainStatus, `Error: ${e.message}`, 'error');
    }
    trainBtn.textContent = 'Extract Fingerprint';
    trainBtn.disabled = false;
  }, 30);
}

function mergeFromInput() {
  if (!currentFingerprint) { flash(trainStatus, 'Extract a fingerprint first', 'error'); return; }
  const src = trainInput.value.trim();
  if (!src) { flash(trainStatus, 'Paste code to merge', 'error'); return; }

  const newFp = engine.extractFingerprint(src);
  currentFingerprint = engine.mergeFingerprints(currentFingerprint, newFp);
  renderFingerprint(currentFingerprint);
  flash(trainStatus, `✓ Merged (${currentFingerprint.sampleCount} samples)`, 'ok');
}

// ── Fingerprint Radar ──────────────────────────────────────────────────────
function renderFingerprint(fp) {
  fingerprintSec.classList.remove('hidden');

  // Build summary scores per dimension (0..1, higher = more "confident/complete")
  const scores = DIMENSION_NAMES.map(dim => {
    const d = fp.dimensions[dim];
    if (!d) return 0.5;
    const vals = Object.values(d).filter(v => typeof v === 'number');
    if (!vals.length) return 0.5;
    // Treat it as "strength" — how clearly defined is this dimension
    const spread = Math.max(...vals) - Math.min(...vals);
    return Math.min(1, 0.3 + spread * 1.5);
  });

  drawRadar(radarCanvas, scores, DIMENSION_LABELS);
  renderDimensionChips(fp, scores);
}

function drawRadar(canvas, scores, labels) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  const N = scores.length;

  ctx.clearRect(0, 0, W, H);

  // Grid rings
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R * (r / 4);
      const y = cy + Math.sin(a) * R * (r / 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Spokes
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = '#1e1e2e';
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = R * Math.max(0.05, scores[i]);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(124,58,237,0.18)';
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots + labels
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = R * Math.max(0.05, scores[i]);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();

    // Label
    const lx = cx + Math.cos(a) * (R + 18);
    const ly = cy + Math.sin(a) * (R + 18);
    ctx.font = '9px JetBrains Mono';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly);
  }
}

function renderDimensionChips(fp, scores) {
  dimensionGrid.innerHTML = '';
  DIMENSION_NAMES.forEach((dim, i) => {
    const chip = document.createElement('div');
    chip.className = 'dim-chip';
    const color = scores[i] > 0.7 ? '#7c3aed' : scores[i] > 0.4 ? '#06b6d4' : '#64748b';
    chip.innerHTML = `
      <div class="dim-chip-label">${DIMENSION_LABELS[i]}</div>
      <div class="dim-chip-bar"><div class="dim-chip-fill" style="width:${Math.round(scores[i]*100)}%;background:${color}"></div></div>
    `;
    dimensionGrid.appendChild(chip);
  });
}

// ── Compare ────────────────────────────────────────────────────────────────
function doCompare() {
  if (!currentFingerprint) {
    flash(trainStatus, 'Train a fingerprint first (left panel)', 'error');
    return;
  }
  const src = compareInput.value.trim();
  if (!src) return;

  compareBtn.textContent = 'Comparing…';
  compareBtn.disabled = true;

  setTimeout(() => {
    try {
      lastComparison = engine.compare(currentFingerprint, src);
      renderScore(lastComparison);
      renderCodeView(lastComparison.perLineDeviations, src);
      renderCorrectionPanel(lastComparison);

      // LLM detection on the compared code
      const llmResult = engine.detectLLM(lastComparison.newFingerprint);
      if (llmResult.isLikelyLLM) {
        flash(trainStatus, `LLM-generated code detected (${Math.round(llmResult.confidence*100)}% confidence)`, 'error');
      }
      playBtn.disabled = false;
      stopBtn.disabled = false;
      document.getElementById('scanModeBtn').disabled = false;
      autoFixBtn.classList.remove('hidden');
    } catch (e) {
      console.error(e);
    }
    compareBtn.textContent = 'Compare & Sonify';
    compareBtn.disabled = false;
  }, 30);
}

// ── Score Ring ─────────────────────────────────────────────────────────────
function renderScore(comparison) {
  scoreSection.classList.remove('hidden');
  const match = 1 - comparison.overallScore;
  const pct = Math.round(match * 100);

  scoreValue.textContent = `${pct}%`;
  scoreValue.style.color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';

  drawScoreRing(scoreCanvas, match);
  renderDimBars(comparison.deviations);
}

function drawScoreRing(canvas, match) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, R = 48;

  ctx.clearRect(0, 0, W, H);

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#1e1e2e';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Score arc
  const color = match >= 0.8 ? '#22c55e' : match >= 0.5 ? '#eab308' : '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + match * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function renderDimBars(deviations) {
  dimBars.innerHTML = '';
  DIMENSION_NAMES.forEach((dim, i) => {
    const dev = deviations[dim] || 0;
    const match = 1 - dev;
    const color = match >= 0.8 ? '#22c55e' : match >= 0.5 ? '#eab308' : '#ef4444';
    const row = document.createElement('div');
    row.className = 'dim-bar-row';
    row.innerHTML = `
      <div class="dim-bar-label">${DIMENSION_LABELS[i]}</div>
      <div class="dim-bar-track"><div class="dim-bar-fill" style="width:${Math.round(match*100)}%;background:${color}"></div></div>
      <div class="dim-bar-val">${Math.round(match*100)}%</div>
    `;
    dimBars.appendChild(row);
  });
}

// ── Code View (annotated) ──────────────────────────────────────────────────
function renderCodeView(perLine, src) {
  codeView.innerHTML = '';

  const allIssues = [];
  perLine.forEach(pl => {
    pl.deviations.forEach(d => {
      allIssues.push({ line: pl.line, dim: d.dim, reason: d.reason });
    });

    const sev = pl.deviations.length === 0 ? 0
      : pl.deviations.length === 1 ? 1
      : pl.deviations.length === 2 ? 2 : 3;

    const row = document.createElement('div');
    row.className = `code-line severity-${sev}`;
    row.dataset.line = pl.line;

    const tooltip = pl.deviations.length > 0
      ? `<div class="line-tooltip">${pl.deviations.map(d => `[${d.dim}] ${d.reason}`).join('<br>')}</div>`
      : '';

    row.innerHTML = `
      <div class="line-num">${pl.line}</div>
      <div class="line-pip"></div>
      <div class="line-text">${escapeHtml(pl.text)}</div>
      ${tooltip}
    `;
    codeView.appendChild(row);
  });

  // Issues list
  if (allIssues.length > 0) {
    issuesList.classList.remove('hidden');
    issueCount.textContent = allIssues.length;
    issuesContent.innerHTML = allIssues.map(iss => `
      <div class="issue-item">
        <span class="issue-line">L${iss.line}</span>
        <span class="issue-dim">${iss.dim}</span>
        <span class="issue-reason">${iss.reason}</span>
      </div>
    `).join('');
  } else {
    issuesList.classList.add('hidden');
  }
}

// ── Correction Panel ───────────────────────────────────────────────────────
function renderCorrectionPanel(comparison) {
  correctionPanel.classList.remove('hidden');
  correctionList.innerHTML = '';

  DIMENSION_NAMES.forEach((dim, i) => {
    const dev = comparison.deviations[dim] || 0;
    const match = 1 - dev;
    const cls = match >= 0.8 ? 'ok' : match >= 0.5 ? 'warn' : '';

    const item = document.createElement('div');
    item.className = 'correction-item';
    item.innerHTML = `
      <span class="correction-name">${DIMENSION_LABELS[i]}</span>
      <span class="correction-score ${cls}">${Math.round(match*100)}%</span>
      <div class="correction-btns">
        <button class="accept" title="This deviation is acceptable — loosen this dimension">✓ accept</button>
        <button class="reject" title="This deviation is wrong — tighten this dimension">✗ reject</button>
      </div>
    `;
    item.querySelector('.accept').addEventListener('click', () => {
      currentFingerprint = engine.applyCorrection(currentFingerprint, dim, 'accept');
      flash(trainStatus, `${DIMENSION_LABELS[i]}: loosened`, 'ok');
      doCompare(); // re-compare with updated corrections
    });
    item.querySelector('.reject').addEventListener('click', () => {
      currentFingerprint = engine.applyCorrection(currentFingerprint, dim, 'reject');
      flash(trainStatus, `${DIMENSION_LABELS[i]}: tightened`, 'error');
      doCompare();
    });
    correctionList.appendChild(item);
  });
}

// ── Fix Suggestions ────────────────────────────────────────────────────────
function showSuggestions() {
  if (!lastComparison || !currentFingerprint) return;
  const ref = currentFingerprint.dimensions;
  const devs = lastComparison.deviations;

  const lines = [];
  lines.push('// === STYLE SUGGESTIONS ===\n');

  if (devs.declarations > 0.3 && ref.declarations.constRatio > 0.8) {
    lines.push('// ① Prefer const over let/var where value is not reassigned');
    lines.push('// ② Replace: var x = 1;  →  const x = 1;');
  }
  if (devs.naming > 0.3) {
    const style = ref.naming.camelCaseRatio > 0.7 ? 'camelCase'
      : ref.naming.snakeCaseRatio > 0.7 ? 'snake_case' : 'PascalCase';
    lines.push(`// ③ Naming convention: use ${style} consistently`);
  }
  if (devs.functions > 0.3 && ref.functions.arrowRatio > 0.6) {
    lines.push('// ④ Prefer arrow functions: function foo() {} → const foo = () => {}');
  }
  if (devs.asyncPatterns > 0.3 && ref.asyncPatterns.asyncAwaitRatio > 0.7) {
    lines.push('// ⑤ Prefer async/await over .then() chains');
  }
  if (devs.formatting > 0.3) {
    lines.push(`// ⑥ Indent: ${ref.formatting.indentUnit} spaces per level`);
    if (ref.formatting.semicolonRatio > 0.8) lines.push('// ⑦ Add semicolons at end of statements');
    if (ref.formatting.semicolonRatio < 0.2) lines.push('// ⑦ Remove semicolons (no-semicolon style)');
  }
  if (devs.errorHandling > 0.3) {
    lines.push('// ⑧ Error handling: avoid empty catch blocks, add meaningful error messages');
  }
  if (devs.comments > 0.3) {
    const dens = ref.comments.density;
    lines.push(`// ⑨ Comment density: ref = ${Math.round(dens*100)}% of lines`);
    if (ref.comments.jsdocPresent) lines.push('// ⑩ Add JSDoc comments for public functions');
  }

  if (lines.length === 1) lines.push('// ✓ Style is within acceptable range for all dimensions');

  compareInput.value = lines.join('\n');
}

// ── 8-Voice Audio ──────────────────────────────────────────────────────────
function initAudio() {
  if (audioCtx && audioCtx.state !== 'closed') return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.connect(audioCtx.destination);

  voices = [];
  noiseNodes = [];
}

function startAudio() {
  if (!lastComparison) return;
  stopAudio();
  initAudio();

  const params = lastComparison.soundParams;
  const t = audioCtx.currentTime + 0.05;

  voices = DIMENSION_NAMES.map((dim, i) => {
    const freq    = params.frequencies[i];
    const amp     = params.amplitudes[i];
    const vibrato = params.vibratos[i];
    const noise   = params.noises[i];

    // Master gain for this voice
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(amp * 0.18, t + 0.3);
    gain.connect(analyser);

    // Main oscillator
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Vibrato LFO
    if (vibrato > 0.5) {
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 5.5 + i * 0.3; // slight per-voice variation
      lfoGain.gain.value = Math.min(vibrato * 0.6, 25);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
    }

    osc.connect(gain);
    osc.start(t);

    // Noise layer (pink-ish — filtered white noise)
    if (noise > 0.05) {
      const bufSize = audioCtx.sampleRate * 2;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let k = 0; k < bufSize; k++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[k] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
      }
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buf;
      noiseSource.loop = true;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(noise * 0.08, t + 0.3);

      noiseSource.connect(noiseGain);
      noiseGain.connect(analyser);
      noiseSource.start(t);
      noiseNodes.push({ source: noiseSource, gain: noiseGain });
    }

    return { osc, gain, freq, amp, noise };
  });

  isPlaying = true;
  audioIndicator.classList.add('playing');
  audioStatus.textContent = 'PLAYING';
  playBtn.disabled = true;
  stopBtn.disabled = false;

  startWaveformLoop();
  startVoiceBarLoop();
}

function stopAudio() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;

  voices.forEach(v => {
    try {
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + 0.2);
      v.osc.stop(t + 0.25);
    } catch (e) {}
  });

  noiseNodes.forEach(n => {
    try {
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + 0.2);
      n.source.stop(t + 0.25);
    } catch (e) {}
  });

  voices = [];
  noiseNodes = [];
  isPlaying = false;
  cancelAnimationFrame(animFrame);

  audioIndicator.classList.remove('playing');
  audioStatus.textContent = 'READY';
  playBtn.disabled = false;
  stopBtn.disabled = true;

  // Clear waveform
  const ctx2 = waveCanvas.getContext('2d');
  ctx2.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

  // Reset voice bars
  for (let i = 0; i < 8; i++) {
    const bar = document.getElementById(`vbar-${i}`);
    if (bar) { bar.style.height = '3px'; bar.style.background = 'var(--border)'; }
  }
}

// ── Waveform ───────────────────────────────────────────────────────────────
function startWaveformLoop() {
  const ctx2 = waveCanvas.getContext('2d');
  const W = waveCanvas.width, H = waveCanvas.height;
  const buf = new Float32Array(analyser.fftSize);

  function draw() {
    if (!isPlaying) return;
    animFrame = requestAnimationFrame(draw);

    analyser.getFloatTimeDomainData(buf);
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = '#060609';
    ctx2.fillRect(0, 0, W, H);

    // Compute overall deviation for color
    const dev = lastComparison ? lastComparison.overallScore : 0;
    const r = Math.round(dev * 220);
    const g = Math.round((1 - dev) * 120 + 60);
    const b = Math.round((1 - dev) * 140 + 80);

    ctx2.beginPath();
    ctx2.strokeStyle = `rgb(${r},${g},${b})`;
    ctx2.lineWidth = 1.5;

    const step = W / buf.length;
    buf.forEach((v, i) => {
      const x = i * step;
      const y = H / 2 + v * H * 0.42;
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    });
    ctx2.stroke();
  }
  draw();
}

function startVoiceBarLoop() {
  const freqData = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    if (!isPlaying) return;
    requestAnimationFrame(tick);
    analyser.getByteFrequencyData(freqData);

    voices.forEach((v, i) => {
      const bar = document.getElementById(`vbar-${i}`);
      if (!bar) return;

      // Get energy around this voice's frequency
      const binHz = audioCtx.sampleRate / analyser.fftSize;
      const centerBin = Math.round(v.freq / binHz);
      let energy = 0;
      for (let b = Math.max(0, centerBin - 2); b <= Math.min(freqData.length - 1, centerBin + 2); b++) {
        energy = Math.max(energy, freqData[b]);
      }
      const h = Math.max(3, Math.round(energy / 255 * 20));
      const match = 1 - v.noise;
      const rr = Math.round(v.noise * 220);
      const gg = Math.round(match * 120 + 60);
      bar.style.height = `${h}px`;
      bar.style.background = `rgb(${rr},${gg},100)`;
    });
  }
  tick();
}

// ── Scan Mode ─────────────────────────────────────────────────────────────
function toggleScanMode() {
  if (!lastComparison) return;
  if (isScanMode) {
    stopScan();
    return;
  }
  startScanMode();
}

function startScanMode() {
  if (!lastComparison || !lastComparison.perLineDeviations) return;

  stopAudio();
  initAudio();
  isScanMode = true;
  scanLine = 0;

  const scanBtn = document.getElementById('scanModeBtn');
  if (scanBtn) {
    scanBtn.textContent = 'STOP SCAN';
    scanBtn.style.borderColor = '#ef4444';
    scanBtn.style.color = '#ef4444';
  }

  // Build 8 persistent voices for scan mode
  const t = audioCtx.currentTime + 0.05;
  voices = BASE_FREQS.map((freq, i) => {
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.connect(analyser);

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // LFO for vibrato
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 5 + i * 0.3;
    lfoGain.gain.setValueAtTime(0, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t);

    osc.connect(gain);
    osc.start(t);

    return { osc, gain, lfo, lfoGain, freq, amp: 0, noise: 0 };
  });

  // Shared noise source
  const bufSize = audioCtx.sampleRate * 2;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let k = 0; k < bufSize; k++) data[k] = Math.random() * 2 - 1;
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = buf;
  noiseSrc.loop = true;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, t);
  noiseSrc.connect(noiseGain);
  noiseGain.connect(analyser);
  noiseSrc.start(t);
  noiseNodes = [{ source: noiseSrc, gain: noiseGain }];

  isPlaying = true;
  audioIndicator.classList.add('playing');
  audioStatus.textContent = 'SCANNING';

  startWaveformLoop();
  // Voice bars driven directly by scanStep, not by analyser

  // Start scan interval
  clearInterval(scanInterval);
  scanInterval = setInterval(scanStep, 1000 / scanSpeed);
  scanStep();
}

function scanStep() {
  if (!isScanMode || !lastComparison) return;
  const perLine = lastComparison.perLineDeviations;
  if (!perLine || scanLine >= perLine.length) {
    stopScan();
    audioStatus.textContent = 'SCAN DONE';
    return;
  }

  const pl = perLine[scanLine];
  const t = audioCtx.currentTime;
  const ramp = 0.04;

  // Update 8 voices from this line's sound params
  const hasDeviation = pl.deviations.length > 0;
  if (pl.soundParams) {
    for (let i = 0; i < voices.length && i < pl.soundParams.frequencies.length; i++) {
      const v = voices[i];

      // Louder gain so oscillations are clearly audible
      const amp = pl.soundParams.amplitudes[i] * 0.22;
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(amp, t + ramp);

      const vib = pl.soundParams.vibratos[i];
      v.lfoGain.gain.cancelScheduledValues(t);
      v.lfoGain.gain.setValueAtTime(v.lfoGain.gain.value, t);
      v.lfoGain.gain.linearRampToValueAtTime(Math.min(vib, 30), t + ramp);

      v.noise = pl.soundParams.noises[i];
      v.amp = pl.soundParams.amplitudes[i];
    }

    // Update noise level — proportional to max deviation on this line
    const maxNoise = Math.max(...pl.soundParams.noises);
    if (noiseNodes.length > 0) {
      const ng = noiseNodes[0].gain;
      ng.gain.cancelScheduledValues(t);
      ng.gain.setValueAtTime(ng.gain.value, t);
      ng.gain.linearRampToValueAtTime(maxNoise * 0.1, t + ramp);
    }
  }

  // Highlight active line in code view
  const allLines = codeView.querySelectorAll('.code-line');
  allLines.forEach(el => el.classList.remove('active'));
  const activeLine = codeView.querySelector(`[data-line="${pl.line}"]`);
  if (activeLine) {
    activeLine.classList.add('active');
    activeLine.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Directly drive voice bars from sound params (not analyser)
  if (pl.soundParams) {
    for (let i = 0; i < 8; i++) {
      const bar = document.getElementById(`vbar-${i}`);
      if (!bar) continue;
      const noise = pl.soundParams.noises[i] || 0;
      const amp = pl.soundParams.amplitudes[i] || 0;
      // Height = amplitude (how loud this voice is)
      const h = Math.max(3, Math.round(amp * 20));
      // Color: green when clean, red when noisy
      const r = Math.round(noise * 240);
      const g = Math.round((1 - noise) * 180 + 40);
      bar.style.height = `${h}px`;
      bar.style.background = `rgb(${r},${g},80)`;
    }
  }

  audioStatus.textContent = `LINE ${pl.line}/${perLine.length}${hasDeviation ? ' !' : ''}`;
  scanLine++;
}

function stopScan() {
  clearInterval(scanInterval);
  scanInterval = null;

  if (isScanMode) {
    isScanMode = false;
    stopAudio();
  }

  const scanBtn = document.getElementById('scanModeBtn');
  if (scanBtn) {
    scanBtn.textContent = 'SCAN MODE';
    scanBtn.style.borderColor = '';
    scanBtn.style.color = '';
  }
}

// ── Utils ──────────────────────────────────────────────────────────────────
function flash(el, msg, cls) {
  el.textContent = msg;
  el.className = `status-text ${cls}`;
  setTimeout(() => { el.textContent = ''; el.className = 'status-text'; }, 3000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
