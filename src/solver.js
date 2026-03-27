/**
 * RESONANT SOLVER — Core Engine
 *
 * Every problem is: minimize E(x₁, x₂, ..., xₙ)
 *
 * Variables → oscillator frequencies
 * Error E(x) → amplitude decay + noise injection
 * Gradient ∇E → vibrato (frequency instability)
 * Constraint violation → beating between oscillators
 *
 * This is NOT a mapping. This IS the optimization made audible.
 *
 * MATHEMATICAL GUARANTEE:
 * - E(x) → 0  ⟹  noise → 0, amplitude → max, vibrato → 0
 * - |∇E| → 0  ⟹  frequency stabilizes
 * - Global minimum = most perceptually stable sound
 */

export class ResonantSolver {
  constructor(config = {}) {
    // Variables
    this.vars = [];           // Current variable values
    this.numVars = 0;

    // Problem definition
    this.errorFn = null;      // E(x) → scalar
    this.gradientFn = null;   // ∇E(x) → vector (or auto-computed)

    // Optimization
    this.lr = config.lr || 0.01;      // Learning rate
    this.momentum = config.momentum || 0.9;
    this.velocity = [];

    // State
    this.error = Infinity;
    this.gradient = [];
    this.gradMagnitude = 0;
    this.step = 0;
    this.converged = false;
    this.history = [];        // Error history for visualization

    // Sound parameters (derived from math, not assigned)
    this.frequencies = [];
    this.amplitudes = [];
    this.vibratos = [];
    this.noises = [];

    // Mapping parameters
    this.freqBase = config.freqBase || 200;
    this.freqScale = config.freqScale || 20;
    this.vibratoScale = config.vibratoScale || 8;
    this.vibratoRate = config.vibratoRate || 5; // Hz
  }

  /**
   * Define a problem.
   * @param {number} numVars - Number of variables
   * @param {Function} errorFn - E(x₁,...,xₙ) → scalar ≥ 0
   * @param {Function} [gradientFn] - ∇E → [∂E/∂x₁, ..., ∂E/∂xₙ]
   * @param {number[]} [initVals] - Initial variable values
   */
  define(numVars, errorFn, gradientFn = null, initVals = null) {
    this.numVars = numVars;
    this.errorFn = errorFn;
    this.gradientFn = gradientFn;

    // Initialize variables (random if not specified)
    this.vars = initVals
      ? [...initVals]
      : Array.from({ length: numVars }, () => (Math.random() - 0.5) * 20);

    this.velocity = new Array(numVars).fill(0);
    this.step = 0;
    this.converged = false;
    this.history = [];

    this._compute();
  }

  /**
   * Compute error, gradient, and all sound parameters.
   * This is the heart — pure math → pure sound.
   */
  _compute() {
    const x = this.vars;

    // 1. Error: E(x)
    this.error = this.errorFn(x);
    this.history.push(this.error);

    // 2. Gradient: ∇E(x)
    if (this.gradientFn) {
      this.gradient = this.gradientFn(x);
    } else {
      // Numerical gradient (central difference)
      this.gradient = this._numericalGradient(x);
    }

    // Gradient magnitude: |∇E|
    this.gradMagnitude = Math.sqrt(
      this.gradient.reduce((sum, g) => sum + g * g, 0)
    );

    // === LAYER 1: Variable → Frequency ===
    // f(xᵢ) = freqBase + freqScale × xᵢ
    // Each variable IS an oscillator
    this.frequencies = x.map(xi => this.freqBase + this.freqScale * xi);

    // === LAYER 2: Error → Amplitude + Noise ===
    // A = exp(-E(x))  — high error = quiet, low error = loud
    // noise ∝ E(x)     — high error = noisy, low error = clean
    const amplitude = Math.exp(-this.error);
    const noise = Math.min(1, this.error / 10);
    this.amplitudes = x.map(() => amplitude);
    this.noises = x.map(() => noise);

    // === LAYER 3: Gradient → Vibrato ===
    // vibrato_i ∝ |∂E/∂xᵢ|
    // Large gradient = frequency shakes. Small gradient = stable tone.
    this.vibratos = this.gradient.map(gi =>
      Math.min(50, Math.abs(gi) * this.vibratoScale)
    );

    // Convergence detection
    this.converged = this.error < 0.001 && this.gradMagnitude < 0.01;
  }

  /**
   * Numerical gradient via central difference.
   * ∂E/∂xᵢ ≈ (E(x + hêᵢ) - E(x - hêᵢ)) / 2h
   */
  _numericalGradient(x) {
    const h = 1e-5;
    return x.map((_, i) => {
      const xPlus = [...x]; xPlus[i] += h;
      const xMinus = [...x]; xMinus[i] -= h;
      return (this.errorFn(xPlus) - this.errorFn(xMinus)) / (2 * h);
    });
  }

  /**
   * Take one optimization step.
   * Gradient descent with momentum + gradient clipping:
   *   g = clip(∇E, maxNorm)
   *   v = μv - lr × g
   *   x = x + v
   */
  step_() {
    // Gradient clipping — prevents explosion on steep problems (e.g. Rosenbrock)
    const maxNorm = 10;
    const norm = Math.sqrt(this.gradient.reduce((s, g) => s + g * g, 0));
    const scale = norm > maxNorm ? maxNorm / norm : 1;

    for (let i = 0; i < this.numVars; i++) {
      const clippedGrad = this.gradient[i] * scale;
      this.velocity[i] = this.momentum * this.velocity[i] - this.lr * clippedGrad;
      this.vars[i] += this.velocity[i];
    }
    this.step++;
    this._compute();
    return { error: this.error, gradient: this.gradient, vars: [...this.vars] };
  }

  /**
   * Reset to random initial position.
   */
  reset(initVals = null) {
    this.vars = initVals
      ? [...initVals]
      : Array.from({ length: this.numVars }, () => (Math.random() - 0.5) * 20);
    this.velocity = new Array(this.numVars).fill(0);
    this.step = 0;
    this.converged = false;
    this.history = [];
    this._compute();
  }

  /**
   * Get current sound parameters.
   * Everything here is mathematically derived:
   *   freq ← variable value
   *   amp  ← exp(-error)
   *   vibrato ← |gradient|
   *   noise ← error
   */
  getSoundParams() {
    return {
      frequencies: this.frequencies,
      amplitudes: this.amplitudes,
      vibratos: this.vibratos,
      noises: this.noises,
      error: this.error,
      gradMagnitude: this.gradMagnitude,
      converged: this.converged,
      step: this.step,
      vars: [...this.vars],
    };
  }
}

// ==================== PROBLEM LIBRARY ====================

export const PROBLEMS = {
  // Step 1: Single variable — find x where x = 5
  single: {
    name: 'Single Variable',
    description: 'E(x) = (x − 5)²',
    detail: 'One oscillator. Noise fades as x → 5. Clean stable tone at the solution.',
    numVars: 1,
    error: ([x]) => (x - 5) ** 2,
    gradient: ([x]) => [2 * (x - 5)],
    init: () => [(Math.random() - 0.5) * 20],
    solution: [5],
  },

  // Step 2: Two variables — system of equations
  system: {
    name: 'Two Variables',
    description: 'E(x,y) = (x + y − 10)² + (x − y − 2)²',
    detail: 'Two oscillators. When both constraints are met, they lock into consonance.',
    numVars: 2,
    error: ([x, y]) => (x + y - 10) ** 2 + (x - y - 2) ** 2,
    gradient: ([x, y]) => [
      2 * (x + y - 10) + 2 * (x - y - 2),
      2 * (x + y - 10) - 2 * (x - y - 2),
    ],
    init: () => [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20],
    solution: [6, 4],
  },

  // Step 3: Quadratic — bowl with one minimum
  quadratic: {
    name: 'Quadratic Bowl',
    description: 'E(x,y) = x² + y²',
    detail: 'Two oscillators converge to origin. Perfect unison = minimum found.',
    numVars: 2,
    error: ([x, y]) => x ** 2 + y ** 2,
    gradient: ([x, y]) => [2 * x, 2 * y],
    init: () => [(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16],
    solution: [0, 0],
  },

  // Step 4: Rosenbrock — the classic hard optimization problem
  rosenbrock: {
    name: 'Rosenbrock Valley',
    description: 'E(x,y) = (1−x)² + 100(y−x²)²',
    detail: 'Famous banana-shaped valley. The optimizer must navigate a narrow curved path. Uses smaller lr.',
    numVars: 2,
    lr: 0.001, // Needs smaller learning rate due to steep gradients
    error: ([x, y]) => (1 - x) ** 2 + 100 * (y - x ** 2) ** 2,
    gradient: ([x, y]) => [
      -2 * (1 - x) - 400 * x * (y - x ** 2),
      200 * (y - x ** 2),
    ],
    init: () => [-1 + Math.random() * 0.5, -1 + Math.random() * 0.5],
    solution: [1, 1],
  },

  // Step 5: Three variables — trilateration
  three: {
    name: 'Three Variables',
    description: 'E(x,y,z) = (x−1)² + (y−2)² + (z−3)² + (x+y+z−6)²',
    detail: 'Three oscillators with a coupling constraint. Listen for three-voice consonance.',
    numVars: 3,
    error: ([x, y, z]) =>
      (x - 1) ** 2 + (y - 2) ** 2 + (z - 3) ** 2 + (x + y + z - 6) ** 2,
    init: () => Array.from({ length: 3 }, () => (Math.random() - 0.5) * 10),
    solution: [1, 2, 3],
  },

  // Step 6: Saddle escape — quartic bowl with offset
  saddle: {
    name: 'Saddle Point',
    description: 'E(x,y) = (x²+y²) + 3sin²(x)sin²(y)',
    detail: 'Multiple local minima. The optimizer must find the global minimum at the origin.',
    numVars: 2,
    error: ([x, y]) => x ** 2 + y ** 2 + 3 * Math.sin(x) ** 2 * Math.sin(y) ** 2,
    init: () => [3 + Math.random(), 3 + Math.random()],
    solution: [0, 0],
  },
};
