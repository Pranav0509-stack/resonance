/**
 * CODE SCANNER — Main Application
 *
 * A sonic cursor that moves through code line by line.
 * At each line, the code quality determines the sound:
 *   - Clean code → pure stable tone
 *   - Messy code → noisy, quiet, shaking
 *
 * Reuses ResonantAudio (1 voice) from the solver project.
 */

import { CodeAnalyzer } from './code-analyzer.js';
import { ResonantAudio } from './audio.js';

const analyzer = new CodeAnalyzer();
const audio = new ResonantAudio();

let analysis = null;  // { lines: LineAnalysis[], parseError: string|null }
let currentLine = 0;
let playing = false;
let paused = false;
let linesPerSec = 4;
let scanInterval = null;
let animFrame = null;

// ===== DOM =====
const $ = id => document.getElementById(id);

// ===== SAMPLE BUTTONS =====
function renderSamples() {
  const container = $('sample-buttons');
  container.innerHTML = Object.entries(SAMPLES).map(([id, s]) =>
    `<button class="sample-btn" data-id="${id}">${s.name}</button>`
  ).join('');
  container.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('code-input').value = SAMPLES[btn.dataset.id].code;
      container.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ===== SCAN CODE =====
function scanCode() {
  const source = $('code-input').value.trim();
  if (!source) return;

  analysis = analyzer.analyze(source);

  // Show/hide sections
  $('input-section').style.display = 'none';
  $('code-section').style.display = '';
  $('viz-section').style.display = '';
  $('controls-section').style.display = '';

  // Show parse error if any
  if (analysis.parseError) {
    $('parse-error').style.display = '';
    $('parse-error').textContent = `Parse error: ${analysis.parseError}`;
  } else {
    $('parse-error').style.display = 'none';
  }

  renderCodeView();
  drawHeatmap();
  drawErrorProfile();
  setCurrentLine(0);
  updateDisplay();
}

// ===== RENDER CODE VIEW =====
function renderCodeView() {
  const view = $('code-view');
  view.innerHTML = analysis.lines.map((l, i) => {
    const errLevel = l.error > 3 ? 'error-high' : l.error > 1 ? 'error-mid' : '';
    const pipColor = l.error > 3 ? 'var(--red)' : l.error > 1 ? 'var(--yellow)' : 'var(--green)';
    const escapedText = escapeHtml(l.text) || ' ';
    return `<div class="code-line ${errLevel}" data-line="${i}">
      <span class="line-gutter">
        <span class="line-pip" style="background:${pipColor}"></span>
        ${l.line}
      </span>
      <span class="line-text">${escapedText}</span>
    </div>`;
  }).join('');

  // Click to jump
  view.querySelectorAll('.code-line').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.line);
      setCurrentLine(idx);
      if (playing && !paused) {
        // Update sound immediately
        updateSound();
      }
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== HEATMAP =====
function drawHeatmap() {
  const canvas = $('heatmap');
  if (!canvas || !analysis) return;

  const lines = analysis.lines;
  const H = Math.max(lines.length * 1.7 * 0.72 * 12, 200); // Approximate line height
  canvas.height = H;
  canvas.width = 16;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 16, H);

  const lineH = H / lines.length;
  for (let i = 0; i < lines.length; i++) {
    const E = lines[i].error;
    const r = Math.min(255, E * 25);
    const g = Math.min(255, Math.max(0, (1 - E / 5) * 200));
    ctx.fillStyle = `rgb(${r},${g},40)`;
    ctx.fillRect(0, i * lineH, 16, Math.max(1, lineH));
  }
}

// ===== ERROR PROFILE CHART =====
function drawErrorProfile() {
  const canvas = $('error-profile');
  if (!canvas || !analysis) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  const lines = analysis.lines;
  ctx.clearRect(0, 0, W, H);

  // Draw error bars
  const maxE = Math.max(1, ...lines.map(l => l.error));
  const barW = W / lines.length;

  for (let i = 0; i < lines.length; i++) {
    const E = lines[i].error;
    const barH = (E / maxE) * H * 0.85;
    const r = Math.min(255, E * 25);
    const g = Math.min(255, Math.max(0, (1 - E / 5) * 200));
    ctx.fillStyle = `rgba(${r},${g},40,0.6)`;
    ctx.fillRect(i * barW, H - barH - H * 0.05, Math.max(1, barW - 1), barH);
  }

  // Cursor marker
  if (currentLine >= 0) {
    const cx = (currentLine + 0.5) * barW;
    ctx.strokeStyle = 'var(--cyan)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }

  // Labels
  ctx.fillStyle = 'rgba(100,116,139,0.5)';
  ctx.font = '9px monospace';
  ctx.fillText(`E(line) — ${lines.length} lines`, 4, 12);
}

// ===== SET CURRENT LINE =====
function setCurrentLine(idx) {
  currentLine = Math.max(0, Math.min(idx, (analysis?.lines.length || 1) - 1));

  // Highlight active line
  const view = $('code-view');
  view.querySelectorAll('.code-line').forEach(el => el.classList.remove('active'));
  const activeLine = view.querySelector(`[data-line="${currentLine}"]`);
  if (activeLine) {
    activeLine.classList.add('active');
    // Scroll into view
    activeLine.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  updateDisplay();
}

// ===== UPDATE DISPLAY =====
function updateDisplay() {
  if (!analysis) return;
  const line = analysis.lines[currentLine];
  if (!line) return;

  // State cards
  $('state-line').textContent = line.line;
  $('state-error').textContent = line.error < 0.1 ? line.error.toFixed(2) : line.error.toFixed(1);
  $('state-error').style.color = line.error < 1 ? 'var(--green)' : line.error < 3 ? 'var(--yellow)' : 'var(--red)';
  $('state-issues').textContent = line.metrics.smells.length;
  $('state-issues').style.color = line.metrics.smells.length === 0 ? 'var(--green)' : 'var(--red)';

  if (playing && !paused) {
    $('state-status').textContent = 'SCANNING...';
    $('state-status').style.color = 'var(--cyan)';
  } else if (paused) {
    $('state-status').textContent = 'PAUSED';
    $('state-status').style.color = 'var(--dim)';
  } else {
    $('state-status').textContent = 'READY';
    $('state-status').style.color = 'var(--dim)';
  }

  // Current line text (truncated)
  const truncated = line.text.trim().substring(0, 40) + (line.text.trim().length > 40 ? '...' : '');
  $('current-line-text').textContent = truncated || '(empty)';

  // Sound param bars
  const sp = line.soundParams;
  const freqPct = Math.min(100, Math.max(0, ((sp.frequency - 150) / 600) * 100));
  const ampPct = Math.min(100, sp.amplitude * 100);
  const vibPct = Math.min(100, (sp.vibrato / 50) * 100);
  const noisePct = Math.min(100, sp.noise * 100);

  $('bar-freq').style.width = `${freqPct}%`;
  $('bar-amp').style.width = `${ampPct}%`;
  $('bar-vib').style.width = `${vibPct}%`;
  $('bar-noise').style.width = `${noisePct}%`;

  // Line detail panel
  $('detail-line-num').textContent = line.line;
  $('detail-depth').textContent = line.metrics.nestingDepth;
  $('detail-depth').style.color = line.metrics.nestingDepth > 3 ? 'var(--red)' : line.metrics.nestingDepth > 1 ? 'var(--yellow)' : 'var(--green)';
  $('detail-weight').textContent = line.metrics.cognitiveWeight;
  $('detail-weight').style.color = line.metrics.cognitiveWeight > 6 ? 'var(--red)' : line.metrics.cognitiveWeight > 3 ? 'var(--yellow)' : 'var(--green)';
  $('detail-length').textContent = line.metrics.lineLength;
  $('detail-length').style.color = line.metrics.lineLength > 120 ? 'var(--red)' : line.metrics.lineLength > 80 ? 'var(--yellow)' : 'var(--green)';
  $('detail-smells').textContent = line.metrics.smells.length > 0 ? line.metrics.smells.join(', ') : '—';
  $('detail-smells').style.color = line.metrics.smells.length > 0 ? 'var(--red)' : 'var(--dim)';

  // Redraw error profile cursor
  drawErrorProfile();
}

// ===== UPDATE SOUND =====
function updateSound() {
  if (!analysis || !audio) return;
  const line = analysis.lines[currentLine];
  if (!line) return;

  audio.update({
    frequencies: [line.soundParams.frequency],
    amplitudes: [line.soundParams.amplitude],
    vibratos: [line.soundParams.vibrato],
    noises: [line.soundParams.noise],
  });
}

// ===== WAVEFORM =====
function drawWaveform() {
  const canvas = $('waveform');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  const analyserNode = audio.getAnalyser();
  if (!analyserNode) {
    ctx.strokeStyle = 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    return;
  }

  const buf = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteTimeDomainData(buf);

  // Color based on current line error
  const E = analysis ? analysis.lines[currentLine]?.error || 0 : 0;
  const r = Math.min(255, E * 50);
  const g = Math.min(255, Math.max(0, (1 - E / 5) * 200));
  const b = Math.min(255, Math.max(0, (1 - E / 10) * 255));
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

  if (playing && !paused) animFrame = requestAnimationFrame(drawWaveform);
}

// ===== SCANNING STEP =====
function scanStep() {
  if (!playing || paused || !analysis) return;

  currentLine++;
  if (currentLine >= analysis.lines.length) {
    // Done — stop
    stopScan();
    $('state-status').textContent = 'DONE';
    $('state-status').style.color = 'var(--green)';
    return;
  }

  setCurrentLine(currentLine);
  updateSound();
}

// ===== PLAY / PAUSE / STOP =====
async function play() {
  if (!analysis) return;
  if (playing && !paused) return;

  await audio.init(1);
  playing = true;
  paused = false;

  $('btn-play').textContent = '▶ SCANNING';
  $('btn-play').classList.add('running');

  // Start scan loop
  clearInterval(scanInterval);
  scanInterval = setInterval(scanStep, 1000 / linesPerSec);

  // Update sound for current line
  updateSound();
  drawWaveform();
}

function pause() {
  paused = !paused;
  if (paused) {
    $('btn-pause').textContent = '▶ RESUME';
    $('btn-play').textContent = '⏸ PAUSED';
    $('btn-play').classList.remove('running');
  } else {
    $('btn-pause').textContent = '⏸ PAUSE';
    $('btn-play').textContent = '▶ SCANNING';
    $('btn-play').classList.add('running');
    drawWaveform();
  }
  updateDisplay();
}

function stopScan() {
  clearInterval(scanInterval);
  playing = false;
  paused = false;
  audio.stop();

  $('btn-play').textContent = '▶ PLAY';
  $('btn-play').classList.remove('running');
  $('btn-pause').textContent = '⏸ PAUSE';
}

function reset() {
  stopScan();
  setCurrentLine(0);
  updateDisplay();

  // Clear waveform
  const canvas = $('waveform');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function goBack() {
  stopScan();
  analysis = null;
  $('input-section').style.display = '';
  $('code-section').style.display = 'none';
  $('viz-section').style.display = 'none';
  $('controls-section').style.display = 'none';
  $('parse-error').style.display = 'none';
}

// ===== INIT =====
function init() {

  $('btn-scan')?.addEventListener('click', scanCode);
  $('btn-play')?.addEventListener('click', play);
  $('btn-pause')?.addEventListener('click', pause);
  $('btn-reset')?.addEventListener('click', reset);
  $('btn-back')?.addEventListener('click', goBack);

  $('speed-slider')?.addEventListener('input', e => {
    linesPerSec = parseInt(e.target.value);
    $('speed-val').textContent = linesPerSec;
    if (playing && !paused) {
      clearInterval(scanInterval);
      scanInterval = setInterval(scanStep, 1000 / linesPerSec);
    }
  });

  $('vol-slider')?.addEventListener('input', e => {
    audio.setVolume(parseFloat(e.target.value));
  });

  // Allow Enter in textarea to not submit
  $('code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      scanCode();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!playing) play();
      else pause();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
