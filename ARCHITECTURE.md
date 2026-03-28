# Resonance — Advanced System Architecture

> **Core Thesis:** Every structural problem has a resonance frequency. Errors are dissonance. Truth is harmony. This document describes how to build that idea into a production system.

---

## Table of Contents

1. [The Deep Problem](#1-the-deep-problem)
2. [Why Sound — The Neuroscience](#2-why-sound--the-neuroscience)
3. [Mathematical Foundations](#3-mathematical-foundations)
4. [Current System Architecture](#4-current-system-architecture)
5. [Production Architecture (v2)](#5-production-architecture-v2)
6. [VS Code Extension Architecture](#6-vs-code-extension-architecture)
7. [Style Fingerprint Engine (Advanced)](#7-style-fingerprint-engine-advanced)
8. [LLM Code Detection Layer](#8-llm-code-detection-layer)
9. [Distributed Team Fingerprinting](#9-distributed-team-fingerprinting)
10. [Audio Engine (Production-Grade)](#10-audio-engine-production-grade)
11. [Performance Targets & Latency Budget](#11-performance-targets--latency-budget)
12. [Data Model](#12-data-model)
13. [Critical Gaps & Fix Timeline](#13-critical-gaps--fix-timeline)
14. [Research Foundation](#14-research-foundation)

---

## 1. The Deep Problem

### The Scale

- **$2.41 trillion** — cost of poor software quality in the US annually (CISQ, 2022)
- **$1.52 trillion** — pure technical debt portion of that
- **$306,000/year** — remediation cost for a 1M-line codebase (Sonar, 2023)
- **40–74%** — percentage of AI-generated code containing security vulnerabilities (Pearce et al. 2022; Siddiq & Santos 2022)
- **Code churn doubled**: 3.1% → 5.7% since Copilot adoption (GitClear, 153M lines of code, 2025)
- **1.7× more issues** in AI-generated code vs human code (CodeRabbit, 470 PRs, 2024)

### The Root Cause

Every current code quality tool — linter, CI, static analysis, code review — shares one fatal design assumption: **the developer must stop writing and look at something**.

This assumption made sense before AI code generation. When a developer wrote every line themselves, they had an inherent quality floor from their own expertise. PR review happened at a natural velocity.

Post-AI, a developer accepting Copilot suggestions is reviewing code **they did not write**, at **2–5× the velocity** of manual coding. The PRs are getting longer. The review queues are backing up. The code churn is doubling.

The developer's **visual channel is 100% utilized** during active coding (IDC, 2024: coding = 16% of developer time, but that 16% is maxed-out concentration). Yet their **auditory channel is completely idle**.

### The Solution Axis

```
Modal tools (linters, CI, review):
  REQUIRE attention → break flow → 23 minutes to recover (Iqbal & Bailey, CHI 2006)

Ambient tools (Resonance):
  INFORM without requiring attention → preattentive processing via MMN →
  developer stays in flow while brain monitors quality
```

The pulse oximeter is the proof of concept. In 1985, operating theatre monitoring depended on visual displays — anaesthetists had to consciously look at monitors. Enhanced sonification was introduced: good oxygen saturation = clean stable tone; falling saturation = tremolo; crisis = pitch drop + rhythm change. Result: detection accuracy **57% → 96%**, detection time **27.4s → 3.3s** (Paterson et al., *British Journal of Anaesthesia*, 2017).

A developer writing code is the anaesthetist. The code quality is the oxygen saturation. Resonance is the pulse oximeter.

---

## 2. Why Sound — The Neuroscience

### Speed Advantage

| Channel | Transduction | Mean Reaction Time |
|---------|-------------|-------------------|
| Visual  | Chemical cascade (phototransduction) | ~331ms |
| Auditory | Mechanical-to-electrical (instantaneous) | ~284ms |

Sound reaches the auditory cortex **47ms faster** than vision processes a stimulus (Shelton & Kumar, *Neuroscience & Medicine*, 2010). This is not preference — it is anatomy.

### The Mismatch Negativity (MMN)

The MMN is an event-related brain potential discovered by Näätänen et al. (1978). It is the single most important mechanism for understanding why ambient audio monitoring works:

- Fires **150–250ms** after any deviation from an acoustic pattern
- Fires **preattentively** — subjects watching silent films, reading books, or engaged in complex tasks show clear MMN responses
- Scales with **magnitude of deviation** — larger acoustic change = earlier, larger MMN
- Driven by **echoic memory** — the auditory system maintains the recent acoustic environment for ≥10 seconds and compares each new sound against it

**In practice:** if a codebase's style profile is encoded as ambient sound, any deviation from established patterns will be registered by the developer's auditory cortex **150–250ms after it occurs**, before conscious attention is engaged. The developer does not need to look at anything.

### Auditory Change Detection vs. Visual Change Blindness

Vision suffers from "change blindness" — subjects miss even large visual changes when a brief (<100ms) interruption occurs. Auditory change detection is the **opposite**: subjects detect changes in 12-tone sequences across time delays with high accuracy (*Psychological Science*, 2008).

### Peripheral Monitoring Without Distraction

Bovermann et al.'s *Reim* toolset (ICAD) demonstrated "peripheral monitoring without causing distraction." Crease and Brewster (Univ. Glasgow) showed participants tracked progress-bar state changes via ambient audio *without removing visual focus from their primary task*.

The design requirement: Resonance sound must stay in the **peripheral channel** — always present as background texture, deviating in ways the MMN detects automatically, never demanding conscious attention.

---

## 3. Mathematical Foundations

### 3.1 The Core Principle

Resonance is NOT mapping data → sound for aesthetic reasons.

It is building a system where:
```
optimization dynamics → acoustic stability

Correct = stable harmonic sound
Incorrect = unstable dissonant noise
```

### 3.2 Variable → Frequency Mapping

```
f(x) = f_base + f_scale × x
```

Where `f_base` and `f_scale` are chosen such that:
- The operating range of x maps to a musically meaningful frequency range
- The mapping is **linear** (invertible — you can tune the dial back to x)
- Default: `f_base = 200 Hz`, `f_scale = 20 Hz/unit`

### 3.3 Error → Amplitude (Signal Strength)

```
A(x) = exp(-E(x))
```

Properties:
- `E = 0` (correct) → `A = 1.0` (maximum, pure)
- `E = 1` → `A = 0.368` (quiet but audible)
- `E = 5` → `A = 0.0067` (nearly silent)
- Monotonically decreasing — any improvement is heard

### 3.4 Error → Noise (Signal Purity)

```
N(x) = min(1, E(x) / E_max)
```

Pink noise (1/f spectrum) layered over the oscillator signal. High error = harsh; low error = pure.

### 3.5 Gradient → Vibrato (Stability)

```
vibrato_depth = min(V_max, |∇E(x)| × k)
f(t) = f(x) + vibrato_depth × sin(2π × f_lfo × t)
```

Large gradient → unstable tone. Gradient = 0 at minimum → perfectly stable.

### 3.6 Multi-Variable → Interference (Constraint Satisfaction)

When multiple variables x₁, x₂, ..., xₙ are each mapped to frequencies f₁, f₂, ..., fₙ, their **interference pattern** encodes constraint satisfaction:

- **Perfect consonance** (e.g., octave: f₂ = 2f₁, ratio 2:1): constraint fully satisfied
- **Beating** (two frequencies close but not equal, |f₂ - f₁| ≈ 1–15 Hz): constraint approximately satisfied
- **Dissonance** (irrational ratios, tritone): constraint violated

This is the A2 harmonic series used in the 8-voice style engine: [165, 220, 275, 330, 385, 440, 495, 550] Hz. When all 8 style dimensions match the fingerprint, these voices form a rich harmonic chord. Deviations pull voices out of tune, creating audible beating and dissonance.

### 3.7 Optimization Convergence Criteria

```
|E(xₙ)| < ε₁          (error threshold)
|∇E(xₙ)| < ε₂         (gradient threshold)
|xₙ - xₙ₋₁| < ε₃     (step threshold, relative)
```

All three must hold simultaneously for convergence. Mathematically sound — avoids false convergence at saddle points.

### 3.8 Code Style Distance Metric

For dimension d with reference vector **r** and comparison vector **c**:

```
deviation_d = (1/|keys|) × Σ |r_k - c_k| / max(|r_k|, |c_k|, 0.01)
```

Bounded to [0, 1]. Weighted by correction factor `w_d ∈ [0.1, 2.0]` (user-tunable via accept/reject).

Overall style distance:
```
S = (1/8) × Σ_d deviation_d × w_d
```

Sound amplitude per voice d:
```
amp_d = exp(-deviation_d × 3)    # 3 = sensitivity parameter
```

---

## 4. Current System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RESONANCE v1 (Current)               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐   │
│  │  Solver  │   │ Scanner  │   │  Style Learner   │   │
│  │ index.html│   │scanner.html│  │  learn.html      │   │
│  └────┬─────┘   └────┬─────┘   └────────┬─────────┘   │
│       │              │                  │               │
│  ┌────▼─────────────▼──────────────────▼─────────┐    │
│  │                   Core Modules                  │    │
│  │  solver.js     code-analyzer.js  style-engine.js│    │
│  │  audio.js      scanner.js        learn.js       │    │
│  └────────────────────────┬────────────────────────┘    │
│                           │                             │
│  ┌────────────────────────▼────────────────────────┐   │
│  │              Web Audio API                       │   │
│  │  OscillatorNode → GainNode → Panner → Analyser  │   │
│  │  BufferSource (noise) → GainNode → Analyser      │   │
│  │  Analyser → AudioDestinationNode                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  AST: Acorn (synchronous, blocks UI thread)             │
│  State: localStorage (style profiles)                   │
│  Build: Vite, ES modules                                │
└─────────────────────────────────────────────────────────┘
```

### Current Capabilities

| Module | What It Does | Quality |
|--------|-------------|---------|
| Solver | 6 optimization problems, gradient descent, convergence sound | ★★★★☆ |
| Scanner | Line-by-line code quality scan with audio playhead | ★★★★☆ |
| Style Learner | 8D fingerprint extraction, 8-voice comparison, profile persistence | ★★★★☆ |
| Audio Engine | Click-free ramps, LFO vibrato, pink noise layer, waveform | ★★★★☆ |
| Code Analyzer | 3-layer semantic analysis (structural + smells + deep logic) | ★★★★☆ |
| Style Engine | AST-based 8D extraction, merge, compare, per-line deviation | ★★★★☆ |

---

## 5. Production Architecture (v2)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         RESONANCE v2 (Production)                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    VS Code Extension (TypeScript)                │    │
│  │                                                                  │    │
│  │  TextDocument.onDidChangeContent (debounced 50ms)               │    │
│  │        ↓                                                         │    │
│  │  DocumentAnalysisQueue (FIFO, drops if 3+ pending)              │    │
│  │        ↓                                                         │    │
│  │  [Web Worker] Tree-sitter WASM → incremental AST               │    │
│  │        ↓                                                         │    │
│  │  StyleDeviationEngine.compare(fingerprint, ast)                 │    │
│  │        ↓                                                         │    │
│  │  SoundMessage { voiceParams[8], perLineDeviations }             │    │
│  │        ↓                                                         │    │
│  │  [Webview] AudioWorklet → 8 voices                              │    │
│  │        ↓                                                         │    │
│  │  [StatusBar] 8 mini voice bars + overall score                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐    │
│  │   Fingerprint Store  │    │        Cloud Sync (Team Mode)        │    │
│  │                      │    │                                      │    │
│  │  Local: ~/.resonance │    │  REST API: api.resonance.dev         │    │
│  │  Format: JSON + SHA  │    │  Auth: GitHub OAuth / SAML           │    │
│  │  Version: Merkle DAG │    │  Sync: fingerprint merge (weighted)  │    │
│  │  Cache: LRU, 500 AST │    │  Analytics: deviation trends         │    │
│  └─────────────────────┘    └──────────────────────────────────────┘    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Audio Architecture                            │   │
│  │                                                                   │   │
│  │  AudioContext (persistent, never closed)                          │   │
│  │    ├── AudioWorklet "resonance-processor"                         │   │
│  │    │     • 8 oscillator voices (processed off main thread)        │   │
│  │    │     • Pink noise generator (Paul Kellet algorithm)           │   │
│  │    │     • Per-voice: frequency, amplitude, vibrato, noise        │   │
│  │    │     • Parameter interpolation at audio-rate (sample-precise) │   │
│  │    ├── GainNode (master volume, user-controlled)                   │   │
│  │    ├── AnalyserNode (waveform/spectrum for StatusBar viz)          │   │
│  │    └── AudioDestinationNode                                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. VS Code Extension Architecture

### File Structure

```
resonance-vscode/
├── package.json                 # Extension manifest
├── src/
│   ├── extension.ts             # Entry point, activation
│   ├── server/
│   │   ├── analysis-server.ts   # LSP-like analysis server
│   │   ├── tree-sitter.worker.ts # Web Worker for AST parsing
│   │   └── fingerprint-store.ts  # Profile management
│   ├── audio/
│   │   ├── audio-manager.ts     # AudioContext lifecycle
│   │   ├── worklet/
│   │   │   └── resonance-processor.js  # AudioWorklet
│   │   └── voice-controller.ts  # 8 voice parameter control
│   ├── ui/
│   │   ├── status-bar.ts        # 8 voice bars in status bar
│   │   ├── deviation-panel.ts   # Side panel: per-line heatmap
│   │   └── profile-panel.ts     # Train/manage fingerprints
│   └── shared/
│       ├── style-engine.ts      # Ported from style-engine.js
│       ├── code-analyzer.ts     # Ported from code-analyzer.js
│       └── types.ts
├── tree-sitter-wasm/            # Bundled WASM parsers
│   ├── tree-sitter.wasm
│   ├── tree-sitter-javascript.wasm
│   ├── tree-sitter-typescript.wasm
│   └── tree-sitter-python.wasm
└── webview/                     # HTML/CSS for panels
    ├── deviation-panel.html
    └── profile-panel.html
```

### Core Data Flow (Per Keystroke)

```
User types character
    ↓ (VS Code fires TextDocument.onDidChangeContent)
extension.ts: debounce(50ms)
    ↓
analysis-server.ts: enqueue(document)
    ↓
tree-sitter.worker.ts: parse(source)          [Web Worker, ~2-5ms]
    ↓
style-engine.ts: compare(fingerprint, ast)    [~5-10ms]
    ↓
{voiceParams, perLineDeviations}
    ↓ (postMessage to AudioWorklet)
resonance-processor.js: updateParams()        [AudioWorklet thread, sample-precise]
    ↓ (sound changes imperceptibly smoothly)
Speaker output                                [Total: <50ms from keystroke]
    ↓ (postMessage to UI)
status-bar.ts: update(voiceParams)            [8 mini bars in status bar]
deviation-panel.ts: update(perLineDeviations) [Side panel heatmap]
```

### AudioWorklet Processor

```javascript
// resonance-processor.js — runs on audio thread, never blocks
class ResonanceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voices = Array.from({ length: 8 }, (_, i) => ({
      phase: 0,
      freq: BASE_FREQS[i],    // [165, 220, 275, 330, 385, 440, 495, 550]
      targetFreq: BASE_FREQS[i],
      amp: 0,
      targetAmp: 0,
      vibrato: 0,
      lfoPhase: 0,
      noise: 0,
      // Pink noise state (Paul Kellet algorithm)
      b: [0, 0, 0, 0, 0, 0, 0],
    }));

    this.port.onmessage = (e) => {
      // Smoothly target new params (called from analysis thread, <50ms)
      const { frequencies, amplitudes, vibratos, noises } = e.data;
      this.voices.forEach((v, i) => {
        v.targetFreq = frequencies[i];
        v.targetAmp = amplitudes[i];
        v.vibrato = vibratos[i];
        v.noise = noises[i];
      });
    };
  }

  process(inputs, outputs) {
    const output = outputs[0][0];
    const SR = sampleRate;
    const smoothing = 0.9995; // ~0.7ms at 44100 Hz

    for (let n = 0; n < output.length; n++) {
      let sample = 0;

      for (const v of this.voices) {
        // Smooth parameter tracking (prevents zipper noise without ramps)
        v.freq += (v.targetFreq - v.freq) * (1 - smoothing);
        v.amp  += (v.targetAmp  - v.amp)  * (1 - smoothing);

        // LFO for vibrato
        v.lfoPhase += (2 * Math.PI * 5.5) / SR;
        const vibDelta = v.vibrato * Math.sin(v.lfoPhase) / SR;

        // Main oscillator
        v.phase += (2 * Math.PI * (v.freq + vibDelta)) / SR;
        const sine = Math.sin(v.phase);

        // Pink noise (Paul Kellet algorithm)
        const white = Math.random() * 2 - 1;
        v.b[0] = 0.99886 * v.b[0] + white * 0.0555179;
        v.b[1] = 0.99332 * v.b[1] + white * 0.0750759;
        v.b[2] = 0.96900 * v.b[2] + white * 0.1538520;
        v.b[3] = 0.86650 * v.b[3] + white * 0.3104856;
        v.b[4] = 0.55000 * v.b[4] + white * 0.5329522;
        v.b[5] = -0.7616 * v.b[5] - white * 0.0168980;
        const pink = (v.b[0]+v.b[1]+v.b[2]+v.b[3]+v.b[4]+v.b[5] + white*0.5362) * 0.11;

        // Mix: sine (clean) vs pink (noisy) based on error level
        sample += v.amp * ((1 - v.noise) * sine + v.noise * pink);
      }

      output[n] = Math.tanh(sample * 0.5); // Soft clip, prevent distortion
    }
    return true;
  }
}
registerProcessor('resonance-processor', ResonanceProcessor);
```

---

## 7. Style Fingerprint Engine (Advanced)

### 8 Dimensions with Expanded Metrics

```typescript
interface StyleFingerprint {
  version: 2;
  createdAt: string;
  sampleCount: number;       // files analyzed
  totalLOC: number;
  language: string;

  dimensions: {
    // D0: Naming Conventions
    naming: {
      camelCaseRatio: number;      // 0–1
      snakeCaseRatio: number;
      pascalCaseRatio: number;
      screamCaseRatio: number;     // UPPER_SNAKE
      avgIdentifierLength: number; // chars
      singleLetterRatio: number;
      prefixPatterns: string[];    // e.g., ['is', 'has', 'get', 'set']
    };

    // D1: Declaration Style
    declarations: {
      constRatio: number;
      letRatio: number;
      varRatio: number;
      avgDeclarationsPerFunction: number;
    };

    // D2: Function Style
    functions: {
      arrowRatio: number;
      avgLength: number;         // lines
      p90Length: number;
      maxLength: number;
      avgParams: number;
      defaultParamRatio: number; // uses default params
    };

    // D3: Structural Complexity
    structure: {
      depthHistogram: number[];  // [d0, d1, d2, d3, d4, d5, d6+]
      avgDepth: number;
      avgCyclomaticComplexity: number;
      avgCognitiveComplexity: number;
    };

    // D4: Formatting
    formatting: {
      indentUnit: number;        // 2 or 4
      useTabs: boolean;
      avgLineLength: number;
      p90LineLength: number;
      maxLineLength: number;
      semicolonRatio: number;
      trailingCommaRatio: number;
    };

    // D5: Error Handling
    errorHandling: {
      tryCatchRatio: number;     // per function
      emptyCatchRatio: number;
      hasThrowStatements: boolean;
      errorTypingRatio: number;  // typed errors vs catch(e)
    };

    // D6: Async Patterns
    asyncPatterns: {
      asyncAwaitRatio: number;
      thenChainRatio: number;
      callbackRatio: number;
      avgPromiseChainLength: number;
    };

    // D7: Comments & Documentation
    comments: {
      density: number;           // comment lines / code lines
      jsdocRatio: number;        // functions with JSDoc
      inlineCommentRatio: number;
      todoCount: number;
      avgCommentLength: number;
    };
  };

  // User-tunable correction weights
  corrections: Record<DimensionName, number>;  // default 1.0

  // File-level metadata
  filePatterns: {
    avgFileLength: number;
    exportPattern: 'named' | 'default' | 'mixed';
    importStyle: 'esm' | 'cjs' | 'mixed';
  };

  // Fingerprint hash for change detection
  hash: string;  // SHA-256 of normalized fingerprint
}
```

### Incremental Fingerprint Merging

When adding a new file to an existing fingerprint:

```
merged_dimension[k] = (existing[k] × w₁ + new[k] × w₂) / (w₁ + w₂)
```

Where `w₁ = existing.sampleCount`, `w₂ = 1`. This is a **Welford online algorithm** — numerically stable, single-pass, no need to store all historical values.

### Fingerprint Versioning (Merkle DAG)

Each fingerprint version stores:
- Content hash (SHA-256 of normalized metrics)
- Parent hash (previous version)
- Merge source hashes (if merged from multiple branches)
- Timestamp and author

This enables:
- Diffing fingerprint evolution over time ("our style shifted after we added TypeScript")
- Branch-specific fingerprints that merge when PRs land
- Blame-style attribution of style drift

---

## 8. LLM Code Detection Layer

### Why LLM Code Sounds Different

LLM-generated code exhibits statistically distinct patterns across all 8 dimensions (Nguyen & Nadi, MSR 2022; GitClear 2025):

| Dimension | Human Code | LLM Code | Detection Signal |
|-----------|-----------|----------|-----------------|
| Naming | Project-specific (mixed) | Generic (camelCase, verbose) | Lower entropy in identifier set |
| Declarations | Mixed const/let | High const (>90%) | Deviation from project norm |
| Functions | Variable length | Short (<20 lines), many arrows | Artificial regularity |
| Structure | Deep nesting common | Flat (<3 levels, via early returns) | Bimodal vs unimodal depth |
| Comments | Sparse, inline | Dense, explanatory JSDoc | Higher density than project norm |
| Async | Mixed | async/await dominant | Deviation if project uses .then() |
| Error handling | Minimal try/catch | Always try/catch | Higher ratio than project norm |

### The LLM Signature (Statistical Fingerprint)

Based on GitClear's analysis of 211M lines of code, LLM-generated code has:
- **Cloned (copy-pasted) lines**: 12.3% vs 8.3% for human (up 48%)
- **Refactored/moved lines**: 9.5% vs 24.1% for human (down 61%)
- **Code churn rate**: 5.7% vs 3.1% for human (up 84%)
- **Function length**: systematically shorter (LLMs prefer sub-20-line functions)
- **Identifier length**: systematically longer (LLMs prefer descriptive names)

### Detection Algorithm

```typescript
function detectLLMGenerated(
  newCode: string,
  projectFingerprint: StyleFingerprint
): LLMDetectionResult {

  const newFp = extractFingerprint(newCode);
  const deviation = compare(projectFingerprint, newFp);

  // LLM-specific pattern scores (0 = human, 1 = LLM)
  const signals = {
    // LLM tends toward high const ratio even if project uses let
    declarationRegularity: newFp.declarations.constRatio > 0.88 ? 1 : 0,

    // LLM functions are suspiciously short and numerous
    functionUniformity: coefficientOfVariation(newFp.functions.avgLength) < 0.3 ? 1 : 0,

    // LLM comments are explanatory (higher density, longer)
    commentExpansion: newFp.comments.density > projectFingerprint.dimensions.comments.density * 1.8 ? 1 : 0,

    // LLM always handles errors (higher try/catch ratio)
    errorHandlingExpansion: newFp.errorHandling.tryCatchRatio > projectFingerprint.dimensions.errorHandling.tryCatchRatio * 2 ? 1 : 0,

    // LLM naming is more verbose than project norm
    namingExpansion: newFp.naming.avgIdentifierLength > projectFingerprint.dimensions.naming.avgIdentifierLength * 1.3 ? 1 : 0,
  };

  const llmScore = Object.values(signals).reduce((a, b) => a + b) / Object.keys(signals).length;

  return {
    isLikelyLLM: llmScore > 0.5,
    confidence: llmScore,
    signals,
    styleDeviation: deviation.overallScore,
    // When BOTH high LLM score AND high deviation: alert
    requiresReview: llmScore > 0.5 && deviation.overallScore > 0.4,
  };
}
```

### Sound Mapping for LLM Detection

When LLM code is detected:
- **Voice 0 (Naming, 165 Hz)**: slight detune from reference (±7 cents)
- **Voice 4 (Formatting, 385 Hz)**: clean (LLM formatting is usually good)
- **Master chord**: subtly brighter timbre (higher harmonics) vs. the warmer sound of well-integrated code

The sound signals "this is well-formed but not from here" — like a musician playing the right notes in the wrong style.

---

## 9. Distributed Team Fingerprinting

### Team Profile Architecture

```
Team Fingerprint (shared, cloud-synced)
    │
    ├── Base fingerprint (weighted merge of all contributors)
    ├── Branch fingerprints (per active branch)
    │     ├── feature/auth  → higher async await ratio (one dev's style)
    │     └── fix/payments  → different error handling pattern
    └── Author fingerprints (per developer)
          ├── alice@   → prefers arrows, no semicolons
          ├── bob@     → function declarations, semicolons
          └── llm@     → high const, verbose naming (Copilot)
```

### Sync Protocol

1. **On commit**: local fingerprint snapshot sent to API
2. **Server**: merges into team fingerprint (Welford weighted average)
3. **On pull**: receive updated team fingerprint
4. **Conflict**: if team fingerprint drifts significantly from local, emit alert sound (major 7th chord → slight dissonance)

### Deviation Analytics (Team Dashboard)

```
/api/v1/teams/:id/analytics

Returns:
- Per-dimension deviation trend (30-day rolling)
- Per-author deviation scores
- LLM code ratio (% of commits triggering LLM detection)
- "Style velocity" — how fast is the codebase's fingerprint changing?
- Files with highest ongoing deviation (technical debt heat map)
```

---

## 10. Audio Engine (Production-Grade)

### Why AudioWorklet (not ScriptProcessorNode)

`ScriptProcessorNode` runs on the main thread → glitches when browser tab is busy.
`AudioWorklet` runs on a **dedicated audio thread** → sample-precise, never glitches.

### Voice Architecture (Detailed)

```
Per voice (×8):
  ┌─────────────────────────────────┐
  │  Oscillator (generated in       │
  │  AudioWorklet at sample rate)   │
  │    + LFO (vibrato modulation)   │
  │    + Pink noise layer           │
  │    + Soft clipper (tanh)        │
  └──────────────┬──────────────────┘
                 │
  ┌──────────────▼──────────────────┐
  │  GainNode (amplitude control)   │
  │  [0.0, 0.18] — max per voice    │
  └──────────────┬──────────────────┘
                 │
  ┌──────────────▼──────────────────┐
  │  StereoPannerNode               │
  │  pan = (line_num / total) × 2-1 │
  │  Left = early lines, Right = late│
  └──────────────┬──────────────────┘
                 │
  ┌──────────────▼──────────────────┐
  │  AnalyserNode (FFT 1024)        │
  │  Used for status bar viz        │
  └──────────────┬──────────────────┘
                 │
                 ▼
            MasterGain → AudioDestinationNode
```

### Convergence Celebration

When style deviation drops below threshold (code matches fingerprint):

```javascript
// Play A2 major chord with natural harmonic decay
const CELEBRATION_CHORD = [220, 275, 330, 440]; // A2, E3, A3/G3, A4

CELEBRATION_CHORD.forEach((freq, i) => {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  env.gain.setValueAtTime(0.12 / (i + 1), t); // Natural harmonic decay
  env.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.2);
});
```

---

## 11. Performance Targets & Latency Budget

### Total Budget: <50ms from keystroke to sound change

| Stage | Current | Target | Method |
|-------|---------|--------|--------|
| Debounce | 50ms | 30ms | Reduce debounce |
| Tree-sitter parse | 2–5ms | 2–5ms | Already fast |
| Style comparison | 5–10ms | <5ms | Memoized AST cache |
| Message to AudioWorklet | <1ms | <1ms | postMessage |
| Audio parameter update | ~0ms (sample-precise) | ~0ms | AudioWorklet smoothing |
| **Total** | **~56ms** | **<40ms** | |

### Memory Budget

| Resource | Current | Limit | Method |
|----------|---------|-------|--------|
| AST cache | None | 50 files, LRU | SHA-256 keyed WeakMap |
| Audio buffers | 8 voices × few KB | 2MB total | Minimal buffer size |
| Style fingerprint | ~5KB JSON | 20KB | Compressed, delta-encoded |
| Extension memory | Unknown | <50MB | Profile with heapUsed |

### Scalability

| Codebase Size | Parse Time | Analysis Time | Approach |
|---------------|-----------|---------------|----------|
| <1K LOC | <5ms | <5ms | Synchronous |
| 1K–100K LOC | 5–100ms | 10–50ms | Web Worker + debounce |
| 100K–10M LOC | 100ms–5s | N/A for whole file | Incremental: analyze changed file only |
| >10M LOC | N/A | N/A | Server-side analysis, push updates |

---

## 12. Data Model

### Fingerprint Store (Local)

```
~/.resonance/
├── profiles/
│   ├── {profile-name}.json         # Full fingerprint
│   ├── {profile-name}.lock.json    # Edit lock (prevent concurrent writes)
│   └── {profile-name}.history/     # Merkle DAG versions
│       ├── {sha256}.json
│       └── index.json
├── cache/
│   ├── ast-cache.json              # {fileHash: astHash, timestamp}
│   └── analysis-cache.json         # {fileHash: analysisResult}
└── config.json
    ├── activeProfile: string
    ├── volume: number               # 0–1
    ├── enabled: boolean
    └── voiceAssignments: object     # dimension → voice index
```

### Cloud Sync (Team Mode)

```
POST /api/v1/fingerprints/merge
{
  teamId: string,
  authorId: string,
  fingerprint: StyleFingerprint,
  commitHash: string,
  files: string[],              // file paths included in this snapshot
}

Response:
{
  teamFingerprint: StyleFingerprint,
  deviations: Record<DimensionName, number>,
  llmRatio: number,             // % of recent code flagged as LLM
  trendAlert: boolean,          // true if drift > threshold in 30 days
}
```

---

## 13. Critical Gaps & Fix Timeline

### Week 1 — Foundation

| Gap | Fix | Time |
|-----|-----|------|
| Magic numbers scattered in 3 files | Centralize in `config.js` | 2h |
| No try/catch around analysis calls | Add error-handling wrapper | 4h |
| Silent parse failures | Graceful degradation with fallback scoring | 4h |
| 0 tests | Jest suite: solver, fingerprint, audio params | 16h |

### Week 2 — Performance

| Gap | Fix | Time |
|-----|-----|------|
| Acorn blocks UI thread on large files | Move to Web Worker | 8h |
| No AST memoization (10 parses of same file) | SHA-256 keyed LRU cache | 4h |
| Fixed learning rate (fails on Rosenbrock class) | Adaptive: backtracking line search | 8h |
| State machine chaos (4 boolean flags) | Explicit state machine (READY/ANALYZING/PLAYING/ERROR) | 8h |

### Week 3 — Audio Quality

| Gap | Fix | Time |
|-----|-----|------|
| ScriptProcessorNode-style pattern (blocks if tab busy) | Migrate to AudioWorklet | 12h |
| 16+ oscillators can glitch | Shared voice pool with recycling | 8h |
| No spatial audio | StereoPannerNode by line number | 4h |
| No harmonic series tuning for consonance | Implement A2 harmonic base properly | 4h |

### Week 4 — VS Code Extension Scaffold

| Task | Time |
|------|------|
| Extension manifest + TypeScript setup | 4h |
| TextDocument.onDidChangeContent handler | 4h |
| Tree-sitter WASM integration in Web Worker | 12h |
| AudioWorklet in VS Code Webview | 8h |
| Status bar 8 voice bars | 4h |
| Profile management panel | 8h |

**Total: ~4 weeks to production VS Code extension**

---

## 14. Research Foundation

### Foundational Papers

| Paper | Year | Key Finding | Application |
|-------|------|-------------|-------------|
| Vickers & Alty, "When Bugs Sing" | 2002 | Programmers used musical feedback to locate bugs in Pascal programs | Direct precedent for code sonification |
| Caliskan-Islam et al., "De-anonymizing Programmers via Code Stylometry" | 2015 | >95% authorship attribution accuracy from AST features alone | Validates 8D fingerprinting approach |
| Näätänen et al., MMN discovery | 1978 | Preattentive auditory deviation detection, 150–250ms, fires without conscious attention | Core neuroscience mechanism |
| Shelton & Kumar | 2010 | Auditory RT 284ms vs visual 331ms | Quantified speed advantage |
| Iqbal & Bailey, CHI | 2006 | 23-minute recovery from interruption; boundary-based recovery | Core argument against modal tools |
| Weiser & Brown, "Designing Calm Technology" | 1995 | Center vs periphery model; sound as peripheral channel | Design principle for ambient mode |
| Paterson et al., BJA | 2017 | Pulse oximeter enhanced sonification: 57% → 96% detection accuracy | Proof of concept at scale |
| Csikszentmihalyi, "Flow" | 1990 | 8 conditions for flow; unambiguous feedback + no interruption | Positions Resonance as flow-preserving |
| GitClear, "AI Copilot Code Quality" | 2025 | Code churn doubled, refactoring collapsed, copy-paste exceeded refactoring | The market timing argument |
| CISQ Cost of Poor Software Quality | 2022 | $2.41T annual cost in US | TAM anchor |

### Patent Landscape

Areas to file provisional patents:
1. **Method and system for ambient sonification of code style deviation** — the 8-voice harmonic mapping specifically
2. **Real-time LLM code detection via style divergence measurement** — the detection algorithm
3. **Optimization convergence via auditory feedback using gradient-modulated vibrato** — the solver

No prior art found in these specific combinations (existing code sonification patents focus on visualization enhancement, not style fingerprinting or LLM detection).

---

*Document version: 2.0 | Last updated: March 2026*
*Repository: https://github.com/Roxrite0509/resonance*
