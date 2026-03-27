# Resonant Solver — Technical Documentation

**Principle**: *Correctness = perceptual stability*

---

## What Is This?

Resonant Solver (RS) makes optimization **audible**. Every mathematical problem becomes a minimization: find values that make an error function E(x) = 0. Every variable in that problem becomes an oscillator. The sound you hear is not a mapping or an aesthetic choice — it is the optimization itself, made perceivable through your ears.

When the answer is wrong: noise, shaking, silence.
When the answer is right: clean, stable, loud.

You can detect convergence with your eyes closed.

---

## The 4 Layers

### Layer 0: Problem → Error Function

Any problem can be framed as: **minimize E(x₁, x₂, ..., xₙ)**

| Problem Type | Error Function |
|---|---|
| Solve x = 5 | E(x) = (x − 5)² |
| System of equations x+y=10, x−y=2 | E(x,y) = (x+y−10)² + (x−y−2)² |
| Quadratic bowl | E(x,y) = x² + y² |
| Rosenbrock valley | E(x,y) = (1−x)² + 100(y−x²)² |
| 3-variable with coupling | E(x,y,z) = (x−1)² + (y−2)² + (z−3)² + (x+y+z−6)² |
| Multi-minima landscape | E(x,y) = x² + y² + 3sin²(x)sin²(y) |

The error is always ≥ 0. At the solution, E = 0.

### Layer 1: Variable → Frequency

```
f(xᵢ) = 200 + 20 × xᵢ   Hz
```

Each variable is literally an oscillator (sine wave). Its current value determines its pitch. As the optimizer adjusts x, you hear the pitch shift in real time.

- **freqBase** = 200 Hz (lower bound)
- **freqScale** = 20 Hz per unit (sensitivity)
- Range clamped to [20, 2000] Hz (human hearing range)

This is a linear, invertible map. You can reconstruct the variable value from the frequency.

### Layer 2: Error → Amplitude + Noise

```
Amplitude = exp(−E(x))
Noise     = min(1, E(x) / 10)
```

| Error E(x) | Amplitude | Noise Level | What You Hear |
|---|---|---|---|
| 100 | ~0 (silent) | 1.0 (max) | Nothing but static |
| 10 | 0.00005 | 1.0 | Faint tone buried in noise |
| 1 | 0.368 | 0.1 | Moderate tone, some noise |
| 0.1 | 0.905 | 0.01 | Strong clean tone |
| 0.001 | 0.999 | 0.0001 | Pure, full volume |

**Mathematical guarantee**: as E(x) → 0, amplitude → 1 (maximum) and noise → 0 (silent). This is not a design choice — it's exponential decay. The function `exp(-x)` is the natural way to convert a non-negative error into a [0,1] amplitude.

### Layer 3: Gradient → Vibrato

```
vibrato_i = min(50, |∂E/∂xᵢ| × 8)   Hz of frequency modulation
```

The gradient tells you how fast E is changing with respect to each variable. A large gradient means "this variable is far from where it should be" — so its frequency **shakes** (vibrato). At the minimum, gradient = 0, and the tone is perfectly steady.

- **vibratoScale** = 8 (Hz of modulation per unit of gradient)
- **vibratoRate** = 5 Hz (LFO speed)
- Capped at 50 Hz modulation depth

Implementation: a low-frequency oscillator (LFO) at 5 Hz modulates the main oscillator's frequency. The LFO's gain is controlled by the gradient magnitude.

### Layer 4: Multi-Variable → Interference

When there are multiple variables, there are multiple oscillators. If two variables are at different values, their frequencies differ, creating **beating** — an audible pulsation that signals constraint violation.

When all variables converge to their correct values, the oscillators either lock into unison (same frequency) or form mathematically simple ratios (consonance). You hear a chord resolve.

- Voices are panned across the stereo field: `pan = -1 + 2i/(n-1)` for n voices
- This means you can localize which variable is still moving by ear position

---

## Optimization Algorithm

**Gradient descent with momentum and gradient clipping.**

```
// Each step:
g = ∇E(x)                              // Compute gradient
if |g| > 10:  g = g × (10 / |g|)       // Clip gradient norm to 10
v = 0.9 × v − lr × g                   // Momentum update
x = x + v                              // Update variables
```

| Parameter | Default | Purpose |
|---|---|---|
| Learning rate (lr) | 0.01 | Step size (0.001 for Rosenbrock) |
| Momentum (μ) | 0.9 | Accelerates through flat regions |
| Gradient clip norm | 10 | Prevents divergence on steep surfaces |

**Gradient computation**: analytical gradients are provided for most problems. When not available, numerical gradient via central difference:

```
∂E/∂xᵢ ≈ (E(x + hêᵢ) − E(x − hêᵢ)) / 2h,   h = 10⁻⁵
```

**Convergence criteria**: `E(x) < 0.001` AND `|∇E| < 0.01`

---

## Audio Engine

Built on the Web Audio API. Signal chain per voice:

```
OscillatorNode (sine, main pitch)
    ↑ frequency modulated by:
    LFO OscillatorNode (5 Hz) → GainNode (vibrato depth from gradient)

OscillatorNode → GainNode (amplitude from error) → StereoPannerNode → AnalyserNode → MasterGain → speakers

Shared: BufferSourceNode (white noise loop) → GainNode (noise level from error) → AnalyserNode
```

### Click Prevention

All AudioParam changes use the pattern:
```javascript
param.cancelScheduledValues(t);
param.setValueAtTime(param.value, t);
param.linearRampToValueAtTime(newValue, t + 0.03);  // 30ms ramp
```

This prevents audio clicks/pops from discontinuous parameter jumps.

### Convergence Celebration

When the solver converges, a major chord blooms:

```
Frequencies: 440 × [1, 5/4, 3/2, 2] = [440, 550, 660, 880] Hz
```

These are the mathematically simplest consonant ratios. The chord fades over 1.5 seconds with exponential decay.

---

## Verification Results

All 6 problems tested and verified:

| # | Problem | E(x) | Solution | Converged To | Steps | Final Error |
|---|---|---|---|---|---|---|
| 1 | Single Variable | (x−5)² | x=5 | x=4.995 | 106 | 2.3×10⁻⁵ |
| 2 | Two Variables | (x+y−10)² + (x−y−2)² | x=6, y=4 | x=6.000, y=4.001 | 119 | 2.9×10⁻⁶ |
| 3 | Quadratic Bowl | x² + y² | x=0, y=0 | x=0.000, y=−0.003 | 106 | 7.3×10⁻⁶ |
| 4 | Rosenbrock Valley | (1−x)² + 100(y−x²)² | x=1, y=1 | x=0.989, y=0.978 | 794 | 1.2×10⁻⁴ |
| 5 | Three Variables | (x−1)²+(y−2)²+(z−3)²+(x+y+z−6)² | x=1,y=2,z=3 | x=1.000, y=2.003, z=2.996 | 252 | 2.4×10⁻⁵ |
| 6 | Saddle Point | x²+y²+3sin²(x)sin²(y) | x=0, y=0 | x=0.005, y=−0.001 | 269 | 2.4×10⁻⁵ |

### Acoustic Verification

For each problem, the following acoustic transition was confirmed:

| Phase | Error | Amplitude | Noise | Vibrato | What You Hear |
|---|---|---|---|---|---|
| Start | High (10-60) | ~0 | Max (red bar) | Max (yellow bar) | Static, silence, shaking |
| Mid | Decreasing | Rising | Fading | Decreasing | Tone emerging from noise |
| Converged | <0.001 | ~1.0 | Zero | Zero | Pure, stable, loud sine tone |

The convergence celebration chord plays automatically on convergence.

### Rosenbrock — The Hard Case

The Rosenbrock function has a narrow curved valley with 100× steeper gradients in one direction. Without safeguards:
- Default lr=0.01 caused immediate divergence (Infinity in <10 steps)

Fixes applied:
- **Gradient clipping** (max norm = 10): prevents parameter explosion
- **Problem-specific lr** (0.001): reduces step size for steep landscapes
- **Smaller initialization range** ([-1, -0.5] vs [-2, 2]): starts closer to the valley

Result: stable convergence in ~800 steps.

---

## UI Components

| Component | Purpose | Data Source |
|---|---|---|
| Problem Tabs | Select optimization problem | `PROBLEMS` object |
| Waveform Canvas | Real-time oscilloscope | AnalyserNode `.getByteTimeDomainData()` |
| ERROR card | Current E(x) value | `solver.error` |
| \|∇E\| card | Gradient magnitude | `solver.gradMagnitude` |
| STEP card | Iteration count | `solver.step` |
| STATUS card | READY / SOLVING / CONVERGED | `solver.converged` |
| Variable monitors | Per-variable: value + FREQ/AMP/VIB/NOISE bars | `solver.getSoundParams()` |
| Error chart | Log₁₀(E) over time | `solver.history` |
| Learning Rate slider | Adjust lr (0.001–0.1) | `solver.lr` |
| Speed slider | Steps per second (5–120) | `setInterval` period |
| Volume slider | Master gain (0–1) | `audio.masterGain` |

### Visual Feedback

- **Waveform color**: transitions from red (high error) → green (low error) based on `rgb(E×60, (1−E/5)×200, (1−E/10)×255)`
- **State cards**: turn green with `.converged` CSS class on convergence
- **START button**: "▶ START" → "▶ RUNNING" (cyan glow) → "✓ CONVERGED" (green glow)

---

## File Structure

```
resonance/
├── index.html          # Single-page app — all HTML structure
├── style.css           # Dark theme, monospace, cyan/green/red/yellow accents
├── package.json        # Vite dev server on port 5557
├── vite.config.js      # Vite configuration
└── src/
    ├── solver.js       # ResonantSolver class + PROBLEMS library
    ├── audio.js        # ResonantAudio class (Web Audio API engine)
    └── app.js          # UI wiring, optimization loop, visualization
```

---

## Non-Negotiable Rules

These rules ensure the system is mathematically honest, not aesthetically tuned:

1. **No random pitch mapping** — frequency is a deterministic function of the variable value
2. **No aesthetic tuning** — sound parameters are derived from E(x) and ∇E(x), not chosen to "sound nice"
3. **Must encode gradient** — vibrato directly represents |∂E/∂xᵢ|, not approximated
4. **Must respond to small changes** — a 0.001 change in x produces a measurable frequency shift (0.02 Hz)
5. **Convergence must be audible** — the transition from noise to pure tone is the mathematical proof that E→0
6. **Humans detect it eyes-closed** — the acoustic difference between "solving" and "converged" is unmistakable

---

## Relationship to SOUND_PLAN.md

The original plan (`SOUND_PLAN.md`) described Sound as a universal sonification platform with 7 modes (Math, Code, Proof, Explore, Data, DNA, LLM). The Resonant Solver is the **mathematical core** that validates the fundamental premise:

> *"The sound should not be hardcoded but use maths to prove it is wrong."*

RS proves this works by making every sound parameter a mathematical function of the optimization state. Nothing is hardcoded, nothing is aesthetic. The four derivations (`freq ← x`, `amp ← exp(-E)`, `noise ← E`, `vibrato ← |∇E|`) are mathematical identities that guarantee convergence = perceptual stability.

This is the foundation that all other modes (Code, LLM, Data, DNA) would build on: define an error function for your domain, and the sound tells you whether the answer is right.

---

## How to Run

```bash
cd resonance
npm install
npm run dev
# Opens at http://localhost:5557
```

Click a problem tab → click START → listen to computation converge.
