# Resonance

**Correctness = perceptual stability.**

Resonance makes computation audible. Not by mapping data to sound — by making the math itself produce sound. Wrong answers are noisy, shaky, quiet. Correct answers are clean, stable, loud. You can detect convergence with your eyes closed.

---

## Three Tools

### 1. Resonant Solver

Every optimization problem becomes a sound. Every variable is an oscillator. The error function controls amplitude and noise. The gradient controls vibrato. Gradient descent runs in real-time — you hear the system converge.

**The 4 Layers:**

| Layer | Math | Sound |
|-------|------|-------|
| Variable → Frequency | `f(x) = 200 + 20x` Hz | Pitch encodes the current value |
| Error → Amplitude + Noise | `A = exp(-E(x))`, `noise = E(x)/10` | Wrong = quiet + noisy, Right = loud + clean |
| Gradient → Vibrato | `vibrato = |∇E(x)| × 8` Hz | Instability = shaking pitch, minimum = rock steady |
| Multi-variable → Interference | `s(t) = Σ sin(fᵢ t)` | Constraint violation = beating between tones |

**6 built-in problems:** Single variable, Two variables, Quadratic bowl, Rosenbrock valley, Three variables, Saddle point.

### 2. Code Scanner

A sonic cursor that moves through code line by line. At each line, code quality determines the sound:

- **Nesting depth** → frequency shift (deeper = higher pitch)
- **Cognitive weight** → noise level
- **Code smells** → vibrato + dissonance (eval, var, loose equality, empty catch, etc.)
- **Semantic issues** → heavy penalties (Math.random() in audio params, missing ramps, dead computations, no gradient in optimization code)

Paste code. Hit PLAY. Close your eyes. The clean sections purr. The messy sections howl.

### 3. Style Learner

Feed it your codebase — it extracts an **8-dimension style fingerprint**. Then paste AI-generated code — hear where it deviates. Each dimension is one voice in an 8-voice harmonic chord.

**8 Dimensions (one voice each):**

| Voice | Dimension | Frequency | What it measures |
|-------|-----------|-----------|------------------|
| 0 | Naming | 165 Hz | camelCase vs snake_case ratios, identifier length |
| 1 | Declarations | 220 Hz | const/let/var ratio |
| 2 | Functions | 275 Hz | Arrow vs function, average length |
| 3 | Structure | 330 Hz | Nesting depth distribution |
| 4 | Formatting | 385 Hz | Indentation, line length, semicolons |
| 5 | Error Handling | 440 Hz | try/catch patterns, empty catches |
| 6 | Async | 495 Hz | async/await vs .then() vs callbacks |
| 7 | Comments | 550 Hz | Density, JSDoc usage, inline vs block |

**How it works:**
- Frequencies form the A2 harmonic series (fundamental 110 Hz)
- Matching dimension → loud, pure sine (consonant partial)
- Deviating dimension → quiet, noisy, vibrato (dissonant)
- All matching → rich harmonic chord
- All deviating → harsh inharmonic noise

**Features:**
- **Train**: Paste reference code → extract fingerprint → radar chart visualization
- **Compare**: Paste new code → per-dimension deviation scores → 8-voice sonification
- **Scan Mode**: Cursor moves line-by-line through compared code, sound updates per line
- **Corrections**: Accept/reject deviations to teach the system your actual standards
- **LLM Detection**: Automatically flags AI-generated code by statistical signature (high const ratio, excessive comments, short functions, over-eager error handling)
- **Persistence**: Save/load fingerprints to localStorage

---

## Technical Architecture

```
resonance/
├── index.html          # Resonant Solver page
├── scanner.html        # Code Scanner page
├── learn.html          # Style Learner page (3-panel layout)
├── style.css           # Shared styles (dark theme, monospace)
├── scanner.css         # Scanner-specific styles
├── learn.css           # Style Learner styles (3-panel grid)
└── src/
    ├── app.js          # Solver controller (gradient descent loop)
    ├── solver.js       # ResonantSolver class (6 problems, gradient computation)
    ├── audio.js        # ResonantAudio class (N-voice Web Audio engine)
    ├── config.js       # All constants in one place (no magic numbers)
    ├── scanner.js      # Scanner controller (line-by-line playback)
    ├── code-analyzer.js # Deep code analysis (AST + semantic smells)
    ├── style-engine.js # Style fingerprinting + comparison + learning
    └── learn.js        # Style Learner controller (8-voice audio + scan mode)
```

### Web Audio Signal Chain

**Per voice:**
```
OscillatorNode (sine, f=200+20x)
    ↓
    ← LFO (5Hz sine, depth=|∇E|×8) modulates frequency
    ↓
GainNode (gain=exp(-E))
    ↓
StereoPannerNode (spread voices across stereo)
    ↓
AnalyserNode (FFT for waveform visualization)
    ↓
MasterGain → destination
```

**Noise path:**
```
AudioBufferSourceNode (2s white noise, looped)
    ↓
GainNode (gain ∝ E(x))
    ↓
AnalyserNode → MasterGain → destination
```

**Click prevention:** Every parameter change uses `cancelScheduledValues(t)` + `setValueAtTime(currentValue, t)` + `linearRampToValueAtTime(target, t + 30ms)`.

### AST Analysis (Acorn)

The Code Analyzer and Style Engine both use [Acorn](https://github.com/acornjs/acorn) to parse JavaScript into an AST, then walk it with `acorn-walk`.

**Code Analyzer detects:**
- Structural: nesting depth, cognitive weight, line length
- Syntax smells: `var`, `==`, `eval`, empty catch, nested ternary, magic numbers
- Semantic smells: `Math.random()` in frequency/amplitude assignments, `setValueAtTime` without ramp (causes audio clicks), computed error never used for sound, optimization loop with no gradient, `setInterval` without `clearInterval`

**Style Engine extracts:**
- Per-identifier naming classification (camelCase/snake_case/PascalCase/SCREAMING_SNAKE)
- Declaration kind ratios (const/let/var)
- Function style ratios (arrow vs declaration vs expression)
- Nesting depth histogram
- Indentation detection (tab vs spaces, unit size)
- Semicolon usage ratio
- Error handling density
- Async pattern ratios (await vs .then vs callbacks)
- Comment density and style

### Sonification Mapping (Non-negotiable Rules)

1. No random pitch mapping — every frequency is derived from a variable value
2. No aesthetic tuning — the math determines the sound
3. Must encode gradient — vibrato depth = gradient magnitude
4. Must respond to small changes — continuous, not discrete
5. Convergence must be audible — humans detect it eyes-closed
6. Sound parameters are invertible — you can reconstruct the math state from the sound

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5557`:
- `/` — Resonant Solver (optimization problems)
- `/scanner.html` — Code Scanner (paste code, hear quality)
- `/learn.html` — Style Learner (train fingerprint, compare code)

## Build

```bash
npm run build    # Output in dist/
npm test         # Run tests
```

## Dependencies

- **[Acorn](https://github.com/acornjs/acorn)** — JavaScript parser (AST generation)
- **[Vite](https://vitejs.dev/)** — Build tool and dev server
- **Web Audio API** — All audio synthesis (no external audio libraries)

Zero runtime dependencies beyond Acorn. No frameworks. No React. No bundler magic. Just math → sound.

---

## The Goal

AI models generate code that is syntactically correct but stylistically wrong for your codebase. Linters catch formatting. Type checkers catch types. But nobody catches **style drift** — the subtle statistical divergence between how your team writes code and how an AI writes code.

Resonance catches it. Not by rules, but by learning the statistical fingerprint of your codebase and making deviations audible. When the AI's code matches your style, you hear harmony. When it doesn't, you hear dissonance. The system learns from your corrections — accept a deviation and it loosens that dimension; reject it and it tightens.

The sound is not a gimmick. It's a parallel information channel. Your eyes read the code. Your ears hear the quality. Both together are faster than either alone.
