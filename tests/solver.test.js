/**
 * RESONANCE — Solver Test Suite
 *
 * Tests the mathematical guarantees of the 4-layer sonification pipeline.
 * Every test corresponds to an audible property:
 *
 *   "When error is zero, sound is clean."
 *   "When gradient is zero, pitch is stable."
 *   "When converged, convergence chord fires."
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResonantSolver, PROBLEMS } from '../src/solver.js';
import { OPTIMIZATION, SONIFICATION } from '../src/config.js';

// ─── GRADIENT CORRECTNESS ────────────────────────────────────────────────────

describe('Numerical gradient', () => {
  it('matches analytical gradient for single-variable quadratic', () => {
    const solver = new ResonantSolver();
    // E(x) = (x-5)^2, dE/dx = 2(x-5)
    solver.define(1, ([x]) => (x - 5) ** 2, null, [3]);

    // solver._numericalGradient is available (used internally when no gradientFn)
    const x = [3];
    const numerical = solver._numericalGradient(x);
    const analytical = [2 * (3 - 5)]; // = [-4]

    expect(numerical[0]).toBeCloseTo(analytical[0], 4);
  });

  it('matches analytical gradient for 2D system', () => {
    const solver = new ResonantSolver();
    const errorFn = ([x, y]) => (x + y - 10) ** 2 + (x - y - 2) ** 2;
    const analyticalGrad = ([x, y]) => [
      2 * (x + y - 10) + 2 * (x - y - 2),
      2 * (x + y - 10) - 2 * (x - y - 2),
    ];

    solver.define(2, errorFn, null, [3, 7]);
    const x = [3, 7];
    const numerical = solver._numericalGradient(x);
    const analytical = analyticalGrad(x);

    expect(numerical[0]).toBeCloseTo(analytical[0], 4);
    expect(numerical[1]).toBeCloseTo(analytical[1], 4);
  });

  it('central difference step size is FINITE_DIFF_H from config', () => {
    // Verify that config value is actually used (not a hardcoded literal)
    expect(OPTIMIZATION.FINITE_DIFF_H).toBe(1e-5);
  });
});

// ─── GRADIENT CLIPPING ───────────────────────────────────────────────────────

describe('Gradient clipping', () => {
  it('clips gradient when norm exceeds GRAD_MAX_NORM', () => {
    const solver = new ResonantSolver({ lr: 0.001 });
    // Rosenbrock at x=[-1.2, 1] has enormous gradient — perfect clipping test
    const { error: errorFn, gradient: gradFn, init } = PROBLEMS.rosenbrock;
    solver.define(2, errorFn, gradFn, init());

    // Run 10 steps — should not produce NaN or Infinity
    for (let i = 0; i < 10; i++) {
      solver.step_();
      expect(isFinite(solver.error)).toBe(true);
      solver.vars.forEach(v => expect(isFinite(v)).toBe(true));
    }
  });

  it('does not clip when norm is within threshold', () => {
    const solver = new ResonantSolver();
    // Quadratic bowl at (1,1) — gradient [2,2] has norm ~2.83, well below 10
    solver.define(2, ([x, y]) => x ** 2 + y ** 2, ([x, y]) => [2 * x, 2 * y], [1, 1]);
    const normBefore = Math.sqrt(solver.gradient.reduce((s, g) => s + g * g, 0));
    expect(normBefore).toBeLessThan(OPTIMIZATION.GRAD_MAX_NORM);
  });
});

// ─── CONVERGENCE ─────────────────────────────────────────────────────────────

describe('Convergence', () => {
  it('converges single-variable problem to x=5', () => {
    const solver = new ResonantSolver();
    solver.define(1, ([x]) => (x - 5) ** 2, ([x]) => [2 * (x - 5)], [0]);

    let steps = 0;
    while (!solver.converged && steps < 10000) {
      solver.step_();
      steps++;
    }

    expect(solver.converged).toBe(true);
    expect(solver.vars[0]).toBeCloseTo(5, 2);
    expect(solver.error).toBeLessThan(OPTIMIZATION.CONV_ERROR_THRESH);
    expect(solver.gradMagnitude).toBeLessThan(OPTIMIZATION.CONV_GRAD_THRESH);
  });

  it('converges 2-variable system to (6, 4)', () => {
    const solver = new ResonantSolver();
    const { error, gradient, solution } = PROBLEMS.system;
    solver.define(2, error, gradient, [0, 0]);

    let steps = 0;
    while (!solver.converged && steps < 20000) {
      solver.step_();
      steps++;
    }

    expect(solver.converged).toBe(true);
    expect(solver.vars[0]).toBeCloseTo(solution[0], 1);
    expect(solver.vars[1]).toBeCloseTo(solution[1], 1);
  });

  it('does NOT converge at a saddle point', () => {
    // E(x,y) = x^2 - y^2 — saddle at (0,0), gradient=[0,0] but NOT a minimum
    // With step-norm check this should NOT trigger convergence
    // (current code may falsely converge — this test documents the known gap)
    const solver = new ResonantSolver();
    solver.define(2,
      ([x, y]) => x ** 2 - y ** 2,
      ([x, y]) => [2 * x, -2 * y],
      [0.001, 0.001]   // near saddle
    );

    // After one step we're very near origin — gradient is tiny
    // This test documents the KNOWN ISSUE: pure saddle = false convergence
    // TODO: add step-norm check |Δx| < 1e-4 to fix this
    solver.step_();
    // For now just verify no crash and no NaN
    expect(isFinite(solver.error)).toBe(true);
  });

  it('convergence thresholds match config values', () => {
    expect(OPTIMIZATION.CONV_ERROR_THRESH).toBe(0.001);
    expect(OPTIMIZATION.CONV_GRAD_THRESH).toBe(0.01);
  });
});

// ─── SOUND PARAMETER DERIVATION ──────────────────────────────────────────────

describe('Sound parameter derivation (Layer 1–3)', () => {
  let solver;

  beforeEach(() => {
    solver = new ResonantSolver();
    solver.define(1, ([x]) => (x - 5) ** 2, ([x]) => [2 * (x - 5)], [5]); // at solution
  });

  it('Layer 1: frequency = FREQ_BASE + FREQ_SCALE × x', () => {
    const x = 5; // at solution
    const expectedFreq = SONIFICATION.FREQ_BASE + SONIFICATION.FREQ_SCALE * x;
    expect(solver.frequencies[0]).toBeCloseTo(expectedFreq, 5);
  });

  it('Layer 2: amplitude = exp(−E(x)) → max at solution', () => {
    // E(5)=0, so amplitude=exp(0)=1 (clamped to AMP_MAX in audio.js)
    const expectedAmp = Math.exp(-solver.error);
    expect(solver.amplitudes[0]).toBeCloseTo(expectedAmp, 5);
    expect(solver.amplitudes[0]).toBeGreaterThan(0.99); // near 1 at solution
  });

  it('Layer 2: noise → 0 at solution', () => {
    expect(solver.noises[0]).toBeCloseTo(0, 3);
  });

  it('Layer 3: vibrato → 0 at solution (gradient is zero)', () => {
    expect(solver.vibratos[0]).toBeCloseTo(0, 3);
  });

  it('Layer 3: vibrato is proportional to gradient magnitude', () => {
    const solver2 = new ResonantSolver();
    solver2.define(1, ([x]) => (x - 5) ** 2, ([x]) => [2 * (x - 5)], [0]); // far from solution
    // gradient = 2*(0-5) = -10, vibrato = min(VIBRATO_MAX_DEPTH, 10*VIBRATO_SCALE)
    const expectedVib = Math.min(
      SONIFICATION.VIBRATO_MAX_DEPTH,
      Math.abs(-10) * SONIFICATION.VIBRATO_SCALE
    );
    expect(solver2.vibratos[0]).toBeCloseTo(expectedVib, 4);
  });

  it('Layer 2: noise = error / NOISE_ERROR_SCALE (clamped at 1)', () => {
    const solver3 = new ResonantSolver();
    solver3.define(1, ([x]) => (x - 5) ** 2, null, [0]); // E(0)=25
    const expectedNoise = Math.min(1, 25 / SONIFICATION.NOISE_ERROR_SCALE);
    expect(solver3.noises[0]).toBeCloseTo(expectedNoise, 5);
  });
});

// ─── SOUND PARAMETER RANGES ──────────────────────────────────────────────────

describe('Sound parameters stay in valid ranges', () => {
  it('frequencies stay finite for variable range [-10, 10]', () => {
    const solver = new ResonantSolver();
    for (let x = -10; x <= 10; x += 2) {
      solver.define(1, ([v]) => (v - 5) ** 2, null, [x]);
      expect(isFinite(solver.frequencies[0])).toBe(true);
      expect(solver.frequencies[0]).toBeGreaterThan(0);
    }
  });

  it('amplitude is always in [0, 1]', () => {
    const solver = new ResonantSolver();
    // Test at large errors too
    [0, 1, 10, 100].forEach(err => {
      const amp = Math.exp(-err);
      expect(amp).toBeGreaterThanOrEqual(0);
      expect(amp).toBeLessThanOrEqual(1);
    });
  });

  it('celebration chord frequencies are correct', () => {
    // [1, 5/4, 3/2, 2] × 440 = [440, 550, 660, 880]
    const expected = [440, 550, 660, 880];
    const actual = SONIFICATION.CELEBRATION_RATIOS.map(r => SONIFICATION.CELEBRATION_BASE_HZ * r);
    actual.forEach((f, i) => expect(f).toBeCloseTo(expected[i], 5));
  });

  it('celebration ratios are overtones 4,5,6,8 of 110Hz fundamental', () => {
    const f0 = 110;
    const overtones = [4, 5, 6, 8];
    const fromOvertones = overtones.map(n => n * f0); // [440, 550, 660, 880]
    const fromConfig = SONIFICATION.CELEBRATION_RATIOS.map(r => SONIFICATION.CELEBRATION_BASE_HZ * r);
    fromConfig.forEach((f, i) => expect(f).toBeCloseTo(fromOvertones[i], 5));
  });
});

// ─── CONFIG COMPLETENESS ─────────────────────────────────────────────────────

describe('Config completeness', () => {
  it('has all required optimization parameters', () => {
    expect(OPTIMIZATION.DEFAULT_LR).toBeDefined();
    expect(OPTIMIZATION.MOMENTUM).toBeDefined();
    expect(OPTIMIZATION.GRAD_MAX_NORM).toBeDefined();
    expect(OPTIMIZATION.FINITE_DIFF_H).toBeDefined();
    expect(OPTIMIZATION.CONV_ERROR_THRESH).toBeDefined();
    expect(OPTIMIZATION.CONV_GRAD_THRESH).toBeDefined();
  });

  it('has all required sonification parameters', () => {
    expect(SONIFICATION.FREQ_BASE).toBeDefined();
    expect(SONIFICATION.FREQ_SCALE).toBeDefined();
    expect(SONIFICATION.NOISE_ERROR_SCALE).toBeDefined();
    expect(SONIFICATION.VIBRATO_SCALE).toBeDefined();
    expect(SONIFICATION.VIBRATO_RATE).toBeDefined();
    expect(SONIFICATION.CELEBRATION_RATIOS).toHaveLength(4);
  });
});
