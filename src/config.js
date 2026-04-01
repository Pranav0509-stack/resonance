/**
 * RESONANCE — Centralized Configuration
 *
 * Every tunable parameter in one place. No magic numbers elsewhere.
 *
 * PHILOSOPHY: Each constant has a mathematical or perceptual reason.
 * Comments explain WHY, not just WHAT.
 *
 * Organized into 5 sections:
 *   1. OPTIMIZATION  — gradient descent dynamics
 *   2. SONIFICATION  — math-to-sound mapping
 *   3. AUDIO_ENGINE  — Web Audio API knobs
 *   4. STYLE         — 8D fingerprint engine
 *   5. UI            — visualization timing
 */

// ─── 1. OPTIMIZATION ─────────────────────────────────────────────────────────

export const OPTIMIZATION = {
  // Gradient descent
  DEFAULT_LR:       0.01,   // Default learning rate (most problems converge cleanly)
  ROSENBROCK_LR:    0.001,  // Rosenbrock override — banana valley has steep 2nd-order gradients
  MOMENTUM:         0.9,    // Nesterov-style momentum — accelerates flat regions

  // Gradient clipping (prevents explosion on ill-conditioned surfaces)
  GRAD_MAX_NORM:    10,     // L2 clip threshold — 10 works for all 6 bundled problems

  // Numerical gradient (central difference approximation)
  FINITE_DIFF_H:    1e-5,   // Step size h: balances truncation vs floating-point error

  // Convergence criteria (both must hold simultaneously)
  CONV_ERROR_THRESH:  0.001, // E(x) < ε — energy below perception threshold
  CONV_GRAD_THRESH:   0.01,  // |∇E| < δ — gradient flat enough (prevents false saddle convergence)
  // TODO: add step-norm check |Δx| < 1e-4 to catch remaining saddle false positives

  // Initial variable range (uniform random in [-range/2, range/2])
  INIT_RANGE:       20,     // Wide enough to exercise different basins
};

// ─── 2. SONIFICATION ─────────────────────────────────────────────────────────
// Maps optimizer state → sound parameters. Invertible by design:
//   f(x)   = FREQ_BASE + FREQ_SCALE × x    (variable → frequency)
//   A      = exp(−E(x))                     (error → amplitude)
//   noise  = E(x) / NOISE_ERROR_SCALE       (error → noise, clamped at 1)
//   vib_i  = |∂E/∂x_i| × VIBRATO_SCALE     (gradient → vibrato depth)

export const SONIFICATION = {
  // Layer 1: Variable → Frequency
  FREQ_BASE:          200,  // Hz — resting tone at x=0 (just below A3=220Hz, perceptually warm)
  FREQ_SCALE:         20,   // Hz/unit — each unit of x shifts pitch by 20Hz

  // Layer 2: Error → Amplitude + Noise
  NOISE_ERROR_SCALE:  10,   // error/NOISE_ERROR_SCALE → noise amplitude [0,1]

  // Layer 3: Gradient → Vibrato
  VIBRATO_SCALE:      8,    // |∂E/∂x| × VIBRATO_SCALE → vibrato depth (Hz)
  VIBRATO_RATE:       5,    // Hz — LFO rate (perceptual optimum: 4–6Hz matches tremolo)
  VIBRATO_MAX_DEPTH:  50,   // Hz — clamp vibrato depth to avoid aliasing

  // Convergence celebration — A major chord at A4
  // Ratios [1, 5/4, 3/2, 2] = overtones 4,5,6,8 of 110Hz fundamental
  // Simplest integer ratios: 4:5:6:8. Maximally consonant by Helmholtz.
  CELEBRATION_BASE_HZ:   440,           // A4
  CELEBRATION_RATIOS:    [1, 5/4, 3/2, 2],
  CELEBRATION_PEAK_GAIN: 0.15,          // Per-voice peak gain
  CELEBRATION_ATTACK:    0.05,          // seconds — bright attack
  CELEBRATION_DECAY:     1.5,           // seconds — exponential decay to silence
  CELEBRATION_DURATION:  1.6,           // seconds — oscillator lifetime
};

// ─── 3. AUDIO ENGINE ─────────────────────────────────────────────────────────

export const AUDIO = {
  // Master mix
  MASTER_GAIN:            0.4,    // Overall output level (prevents clipping on ≥3 voices)

  // Frequency clamp (keeps audio in perceptual range)
  FREQ_MIN_HZ:            20,     // Sub-bass floor — Web Audio API minimum
  FREQ_MAX_HZ:            2000,   // 2kHz ceiling — preserves detail without harshness

  // Amplitude clamp
  AMP_MAX:                0.8,    // Per-voice amplitude ceiling (headroom for multiple voices)

  // Vibrato (LFO) clamp
  VIBRATO_MAX_HZ:         80,     // Prevents beating artifacts on large gradients

  // Noise
  NOISE_GAIN_SCALE:       0.3,    // noises[0] × NOISE_GAIN_SCALE → final noise gain
  NOISE_GAIN_MAX:         0.5,    // Ceiling — keeps noise from overwhelming signal

  // Noise buffer
  NOISE_BUFFER_SECONDS:   2,      // White noise loop length (longer = less perceptible repeat)

  // Ramp timing (prevents audio clicks on parameter changes)
  PARAM_RAMP_SECONDS:     0.03,   // 30ms — fast enough for responsiveness, slow enough for click-free
  VOLUME_RAMP_SECONDS:    0.05,   // 50ms — slightly slower for setVolume() calls

  // Analyser
  FFT_SIZE:               2048,   // Frequency resolution for visualizer
  SMOOTHING_TIME:         0.4,    // Time constant — 0 = instant, 1 = frozen
};

// ─── 4. STYLE ENGINE ─────────────────────────────────────────────────────────
// 8-dimensional style fingerprint. Each dimension maps to one harmonic
// in the A2 series (110Hz fundamental, partials 1.5–5):
//
//   dim 0: Naming      → 165 Hz  (A2 × 1.5, a fifth)
//   dim 1: Decls       → 220 Hz  (A3, octave)
//   dim 2: Functions   → 275 Hz  (E4, major third above A3)
//   dim 3: Structure   → 330 Hz  (E4 × 1.2 ≈ major sixth)
//   dim 4: Formatting  → 385 Hz  (approx G4)
//   dim 5: Errors      → 440 Hz  (A4 — most prominent)
//   dim 6: Async       → 495 Hz  (B4)
//   dim 7: Comments    → 550 Hz  (C#5)

export const STYLE = {
  // Dimension frequencies (A2 harmonic series, fundamental 110Hz)
  DIM_FREQUENCIES: [165, 220, 275, 330, 385, 440, 495, 550], // Hz

  // Dimension names (for UI labels and fix suggestions)
  DIM_NAMES: [
    'Naming',           // camelCase vs snake_case, length conventions
    'Declarations',     // const vs let vs var ratio
    'Functions',        // arrow vs regular, length, complexity
    'Structure',        // nesting depth, module organization
    'Formatting',       // line length, blank lines, indentation
    'Error Handling',   // try/catch density, error propagation
    'Async Patterns',   // async/await vs .then() vs callback
    'Comments',         // density, JSDoc usage, inline ratios
  ],

  // Welford online algorithm parameters
  WELFORD_MIN_SAMPLES:  5,   // Minimum samples before fingerprint is considered stable
  CORRECTION_WEIGHT:    0.1, // How much a single accept/reject shifts the fingerprint

  // LLM detection thresholds (empirically derived from GPT-4/Claude-3 samples)
  LLM_CONST_RATIO_THRESHOLD:    0.88, // const/(const+let+var) > 88% → likely LLM
  LLM_COMMENT_DENSITY_THRESHOLD: 0.3, // comments/total_lines > 30% → likely LLM
  LLM_AVG_FN_LENGTH_THRESHOLD:   15,  // avg lines per function < 15 → LLM prefers short functions
  LLM_TRYCATCH_RATIO_THRESHOLD:  0.1, // try/catch blocks per function > 0.1 → LLM over-handles errors

  // Deviation thresholds for scoring
  MATCH_GOOD_THRESHOLD:   0.8,  // ≥80% match → green (good)
  MATCH_WARN_THRESHOLD:   0.5,  // 50–79% → yellow (warn)
                                 // <50% → red (diverged)
};

// ─── 5. UI & VISUALIZATION ───────────────────────────────────────────────────

export const UI = {
  // Animation
  TARGET_FPS:           60,    // requestAnimationFrame target
  STEP_INTERVAL_MS:     16,    // ~60fps for solver steps (~one step per frame)
  HISTORY_MAX_POINTS:   200,   // Error history graph max length

  // Score ring
  SCORE_RING_COLORS: {
    good: '#4ade80',    // green-400
    warn: '#facc15',    // yellow-400
    bad:  '#f87171',    // red-400
  },

  // Waveform visualizer
  WAVEFORM_LINE_WIDTH:  2,
  WAVEFORM_COLOR:       '#7c3aed', // violet-700

  // Radar chart (8-voice style fingerprint)
  RADAR_FILL_ALPHA:     0.2,
  RADAR_STROKE_WIDTH:   2,
  RADAR_COLORS: {
    reference: '#60a5fa',  // blue-400
    current:   '#f472b6',  // pink-400
  },
};

// ─── DERIVED CONSTANTS (computed from above) ─────────────────────────────────
// These depend on the values above — do not edit directly.

export const DERIVED = {
  // Frequency bounds for all voices (from SONIFICATION + AUDIO)
  VOICE_FREQ_RANGE: {
    min: AUDIO.FREQ_MIN_HZ,
    max: AUDIO.FREQ_MAX_HZ,
  },

  // Convergence chord frequencies (from SONIFICATION)
  CELEBRATION_FREQS: SONIFICATION.CELEBRATION_RATIOS.map(
    r => SONIFICATION.CELEBRATION_BASE_HZ * r
  ), // [440, 550, 660, 880] → A4 major chord

  // Style dimension count
  STYLE_DIM_COUNT: STYLE.DIM_FREQUENCIES.length, // 8
};
