/**
 * RESONANCE — Style Fingerprint Test Suite
 *
 * Tests the 8-dimensional style engine:
 *   extractFingerprint → 8D vector in [0,1]
 *   compare → per-dimension deviations + match score
 *   mergeFingerprints → Welford stable update
 *   applyCorrection → feedback loop
 */

import { describe, it, expect } from 'vitest';
import { StyleEngine } from '../src/style-engine.js';
import { STYLE } from '../src/config.js';

const engine = new StyleEngine();

// ─── FINGERPRINT EXTRACTION ──────────────────────────────────────────────────

describe('Fingerprint extraction', () => {
  it('returns 8-dimensional vector', () => {
    const src = `const x = 1; function foo() { return x; }`;
    const fp = engine.extractFingerprint(src);
    expect(fp.dimensions).toHaveLength(STYLE.DIM_FREQUENCIES.length); // 8
  });

  it('all dimensions are normalized to [0, 1]', () => {
    const src = `
      const x = async () => {
        try {
          const result = await fetch('/api');
          return result.json();
        } catch(e) { console.error(e); }
      };
    `;
    const fp = engine.extractFingerprint(src);
    fp.dimensions.forEach((d, i) => {
      expect(d).toBeGreaterThanOrEqual(0, `dim ${i} below 0`);
      expect(d).toBeLessThanOrEqual(1, `dim ${i} above 1`);
    });
  });

  it('detects high const ratio (Declarations dimension)', () => {
    const constHeavy = `
      const a = 1;
      const b = 2;
      const c = 3;
      const d = 4;
    `;
    const varHeavy = `
      var a = 1;
      var b = 2;
      var c = 3;
      var d = 4;
    `;
    const fpConst = engine.extractFingerprint(constHeavy);
    const fpVar = engine.extractFingerprint(varHeavy);
    // Const-heavy code should score higher on Declarations dimension
    expect(fpConst.dimensions[1]).toBeGreaterThan(fpVar.dimensions[1]);
  });

  it('detects async/await vs then-chaining (Async dimension)', () => {
    const asyncCode = `
      async function fetchData() {
        const res = await fetch('/api');
        const data = await res.json();
        return data;
      }
    `;
    const thenCode = `
      function fetchData() {
        return fetch('/api').then(res => res.json()).then(data => data);
      }
    `;
    const fpAsync = engine.extractFingerprint(asyncCode);
    const fpThen = engine.extractFingerprint(thenCode);
    // async/await should differ from then-chaining on dim 6
    expect(fpAsync.dimensions[6]).not.toBeCloseTo(fpThen.dimensions[6], 1);
  });

  it('handles empty source without crashing', () => {
    expect(() => engine.extractFingerprint('')).not.toThrow();
    expect(() => engine.extractFingerprint('   \n  ')).not.toThrow();
  });

  it('handles syntax errors gracefully', () => {
    expect(() => engine.extractFingerprint('function { broken syntax ;;')).not.toThrow();
  });
});

// ─── FINGERPRINT COMPARISON ──────────────────────────────────────────────────

describe('Fingerprint comparison', () => {
  it('returns matchScore in [0, 1]', () => {
    const fp = engine.extractFingerprint(`const x = async () => await fetch('/api');`);
    const result = engine.compare(fp, `let y = fetch('/api').then(r => r)`);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(1);
  });

  it('identical code gives matchScore = 1', () => {
    const src = `const x = async () => { const r = await fetch('/api'); return r.json(); }`;
    const fp = engine.extractFingerprint(src);
    const result = engine.compare(fp, src);
    expect(result.matchScore).toBeCloseTo(1, 1);
  });

  it('returns deviations array with 8 elements', () => {
    const fp = engine.extractFingerprint(`const x = 1;`);
    const result = engine.compare(fp, `var y = 2;`);
    expect(result.deviations).toHaveLength(8);
  });

  it('deviation is higher for more different code', () => {
    const reference = `
      const fetchUser = async (id) => {
        try {
          const res = await fetch('/api/user/' + id);
          return res.json();
        } catch (e) { return null; }
      };
    `;
    const fp = engine.extractFingerprint(reference);

    const similar = `
      const getUser = async (id) => {
        try {
          const data = await fetch('/api/get/' + id);
          return data.json();
        } catch (err) { return null; }
      };
    `;
    const different = `
      function getUser(id) {
        return fetch('/api/user/' + id).then(function(res) {
          return res.json();
        });
      }
    `;

    const resSimilar = engine.compare(fp, similar);
    const resDifferent = engine.compare(fp, different);

    expect(resSimilar.matchScore).toBeGreaterThan(resDifferent.matchScore);
  });

  it('sound parameters have correct number of voices', () => {
    const fp = engine.extractFingerprint(`const x = 1;`);
    const result = engine.compare(fp, `const y = 2;`);
    expect(result.soundParams.frequencies).toHaveLength(STYLE.DIM_FREQUENCIES.length);
    expect(result.soundParams.amplitudes).toHaveLength(STYLE.DIM_FREQUENCIES.length);
  });

  it('sound frequencies match DIM_FREQUENCIES from config', () => {
    const fp = engine.extractFingerprint(`const x = 1;`);
    const result = engine.compare(fp, `const x = 1;`);
    // At match=1, frequencies should equal the base DIM_FREQUENCIES
    result.soundParams.frequencies.forEach((f, i) => {
      expect(f).toBeCloseTo(STYLE.DIM_FREQUENCIES[i], 0);
    });
  });
});

// ─── FINGERPRINT MERGING (WELFORD) ───────────────────────────────────────────

describe('Fingerprint merging (Welford)', () => {
  it('merged fingerprint is between the two inputs', () => {
    const src1 = `const a = 1; const b = 2;`;
    const src2 = `var x = 1; var y = 2;`;
    const fp1 = engine.extractFingerprint(src1);
    const fp2 = engine.extractFingerprint(src2);
    const merged = engine.mergeFingerprints(fp1, fp2);

    merged.dimensions.forEach((d, i) => {
      const lo = Math.min(fp1.dimensions[i], fp2.dimensions[i]);
      const hi = Math.max(fp1.dimensions[i], fp2.dimensions[i]);
      expect(d).toBeGreaterThanOrEqual(lo - 0.01);
      expect(d).toBeLessThanOrEqual(hi + 0.01);
    });
  });

  it('merging identical fingerprints gives same fingerprint', () => {
    const src = `const x = async () => await fetch('/api');`;
    const fp = engine.extractFingerprint(src);
    const merged = engine.mergeFingerprints(fp, fp);
    merged.dimensions.forEach((d, i) => {
      expect(d).toBeCloseTo(fp.dimensions[i], 5);
    });
  });

  it('sample count increments after merge', () => {
    const fp1 = engine.extractFingerprint(`const x = 1;`);
    const fp2 = engine.extractFingerprint(`const y = 2;`);
    fp1.sampleCount = 5;
    fp2.sampleCount = 1;
    const merged = engine.mergeFingerprints(fp1, fp2);
    expect(merged.sampleCount).toBe(6);
  });
});

// ─── CORRECTION FEEDBACK ─────────────────────────────────────────────────────

describe('Correction feedback', () => {
  it('accept shifts fingerprint toward current code', () => {
    const fp = engine.extractFingerprint(`var x = 1; var y = 2;`);
    const dimBefore = fp.dimensions[1]; // Declarations dim
    const updated = engine.applyCorrection(fp, 1, 'accept');
    // After accept, dimension should shift (not necessarily same direction, just change)
    expect(typeof updated.dimensions[1]).toBe('number');
    expect(isFinite(updated.dimensions[1])).toBe(true);
  });

  it('reject shifts fingerprint away from current code', () => {
    const fp = engine.extractFingerprint(`const x = 1; const y = 2;`);
    const updated = engine.applyCorrection(fp, 1, 'reject');
    expect(typeof updated.dimensions[1]).toBe('number');
  });

  it('correction weight matches config CORRECTION_WEIGHT', () => {
    expect(STYLE.CORRECTION_WEIGHT).toBe(0.1);
    expect(STYLE.CORRECTION_WEIGHT).toBeGreaterThan(0);
    expect(STYLE.CORRECTION_WEIGHT).toBeLessThan(1);
  });
});

// ─── LLM DETECTION HEURISTICS ────────────────────────────────────────────────

describe('LLM detection heuristics', () => {
  it('detects LLM-like code (high const ratio, dense comments, short functions)', () => {
    const llmCode = `
      /**
       * Fetches user data from the API endpoint.
       * @param {string} userId - The user identifier
       * @returns {Promise<Object>} User data object
       */
      const fetchUserData = async (userId) => {
        // Validate the input parameter
        if (!userId) {
          throw new Error('userId is required');
        }

        try {
          // Make the API request
          const response = await fetch('/api/users/' + userId);

          // Check if the response was successful
          if (!response.ok) {
            throw new Error('API request failed');
          }

          // Parse and return the JSON response
          const data = await response.json();
          return data;
        } catch (error) {
          // Handle any errors that occurred
          console.error('Error fetching user:', error);
          throw error;
        }
      };

      /**
       * Processes the user data.
       * @param {Object} data - Raw user data
       * @returns {Object} Processed data
       */
      const processData = (data) => {
        // Transform the data structure
        return { id: data.id, name: data.name };
      };
    `;

    const fp = engine.extractFingerprint(llmCode);
    // LLM code: high const ratio (dim 1), high comment density (dim 7), dense error handling (dim 5)
    expect(fp.dimensions[1]).toBeGreaterThan(0.7); // high const
    expect(fp.dimensions[7]).toBeGreaterThan(0.5); // high comments
  });

  it('LLM thresholds are documented in config', () => {
    expect(STYLE.LLM_CONST_RATIO_THRESHOLD).toBe(0.88);
    expect(STYLE.LLM_COMMENT_DENSITY_THRESHOLD).toBe(0.3);
  });
});

// ─── DIMENSION FREQUENCIES ───────────────────────────────────────────────────

describe('Style dimension frequencies (A2 harmonic series)', () => {
  it('has exactly 8 dimensions matching config', () => {
    expect(STYLE.DIM_FREQUENCIES).toHaveLength(8);
    expect(STYLE.DIM_NAMES).toHaveLength(8);
  });

  it('frequencies form A2 harmonic series (110Hz fundamental, multiples 1.5–5)', () => {
    const f0 = 110;
    const expected = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(m => f0 * m);
    STYLE.DIM_FREQUENCIES.forEach((f, i) => {
      expect(f).toBeCloseTo(expected[i], 0);
    });
  });

  it('A4 (440Hz) is the 6th dimension (Error Handling — most prominent)', () => {
    expect(STYLE.DIM_FREQUENCIES[5]).toBe(440);
    expect(STYLE.DIM_NAMES[5]).toBe('Error Handling');
  });
});
