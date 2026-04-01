/**
 * STYLE ENGINE — Code Style Fingerprinting + Comparison + Learning
 *
 * Feed it your codebase → it extracts a statistical "style fingerprint"
 * across 8 dimensions. Then compare new code against the fingerprint →
 * deviations become dissonance. Each dimension is one audio voice.
 *
 * 8 DIMENSIONS:
 *   0. Naming    — camelCase/snake_case/PascalCase ratios, identifier length
 *   1. Declarations — const/let/var ratios
 *   2. Functions — arrow vs function, average length
 *   3. Structure — nesting depth distribution
 *   4. Formatting — indentation, line length, semicolons
 *   5. Error Handling — try/catch patterns, empty catches
 *   6. Async — async/await vs .then() vs callbacks
 *   7. Comments — density, style (inline vs block)
 *
 * SOUND MAPPING:
 *   Base frequencies: A2 harmonic series [165, 220, 275, 330, 385, 440, 495, 550]
 *   Matching dimension → loud, pure tone (consonant partial)
 *   Deviating dimension → quiet, noisy, vibrato (dissonant)
 *   All matching → rich harmonic chord
 */

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const STORAGE_KEY = 'resonance-style-fingerprints';
const DIMENSION_NAMES = ['naming', 'declarations', 'functions', 'structure', 'formatting', 'errorHandling', 'asyncPatterns', 'comments'];
const DIMENSION_LABELS = ['Naming', 'Declarations', 'Functions', 'Structure', 'Formatting', 'Error Handling', 'Async', 'Comments'];
const BASE_FREQS = [165, 220, 275, 330, 385, 440, 495, 550]; // A2 harmonic series

export { DIMENSION_NAMES, DIMENSION_LABELS, BASE_FREQS };

export class StyleEngine {

  // ==================== EXTRACT FINGERPRINT ====================

  extractFingerprint(source) {
    const lines = source.split('\n');
    const stats = this._initStats();

    try {
      const ast = acorn.parse(source, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true,
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
      });

      this._walkAST(ast, stats);
    } catch (e) {
      // Still extract what we can from raw text
    }

    this._analyzeText(lines, stats);
    return this._normalizeStats(stats);
  }

  _initStats() {
    return {
      // Naming
      identifiers: [],
      camelCount: 0, snakeCount: 0, pascalCount: 0, screamCount: 0,
      singleLetterCount: 0, totalIdCount: 0,

      // Declarations
      constCount: 0, letCount: 0, varCount: 0,

      // Functions
      arrowCount: 0, funcDeclCount: 0, funcExprCount: 0,
      functionLengths: [],

      // Structure
      depthCounts: [0, 0, 0, 0, 0, 0, 0], // depth 0-6+

      // Error handling
      tryCatchCount: 0, emptyCatchCount: 0, throwCount: 0,
      totalFunctions: 0,

      // Async
      awaitCount: 0, thenCount: 0, callbackCount: 0,

      // Comments & formatting (from text analysis)
      commentLines: 0, codeLines: 0, blankLines: 0,
      jsdocCount: 0, inlineCommentCount: 0, blockCommentCount: 0,
      lineLengths: [],
      indentSizes: [],
      semicolonLines: 0, nonSemicolonLines: 0,
    };
  }

  _walkAST(ast, stats) {
    const seenIds = new Set();

    walk.ancestor(ast, {
      Identifier(node) {
        const name = node.name;
        if (seenIds.has(name) || name.length === 0) return;
        seenIds.add(name);
        stats.totalIdCount++;
        stats.identifiers.push(name);

        if (name.length === 1) stats.singleLetterCount++;
        if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) stats.camelCount++;
        else if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) stats.snakeCount++;
        else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) stats.pascalCount++;
        else if (/^[A-Z][A-Z0-9_]*$/.test(name) && name.length > 1) stats.screamCount++;
      },

      VariableDeclaration(node) {
        if (node.kind === 'const') stats.constCount++;
        else if (node.kind === 'let') stats.letCount++;
        else if (node.kind === 'var') stats.varCount++;
      },

      ArrowFunctionExpression(node) {
        stats.arrowCount++;
        stats.totalFunctions++;
        if (node.loc) {
          stats.functionLengths.push(node.loc.end.line - node.loc.start.line);
        }
      },

      FunctionDeclaration(node) {
        stats.funcDeclCount++;
        stats.totalFunctions++;
        if (node.loc) {
          stats.functionLengths.push(node.loc.end.line - node.loc.start.line);
        }
      },

      FunctionExpression(node) {
        stats.funcExprCount++;
        stats.totalFunctions++;
        if (node.loc) {
          stats.functionLengths.push(node.loc.end.line - node.loc.start.line);
        }
      },

      IfStatement(node, ancestors) {
        const depth = Math.min(6, ancestors.filter(a =>
          ['IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement',
           'ForInStatement', 'ForOfStatement', 'SwitchCase', 'TryStatement'].includes(a.type)
        ).length);
        stats.depthCounts[depth]++;
      },

      ForStatement(node, ancestors) {
        const depth = Math.min(6, ancestors.filter(a =>
          ['IfStatement', 'ForStatement', 'WhileStatement', 'ForInStatement', 'ForOfStatement'].includes(a.type)
        ).length);
        stats.depthCounts[depth]++;
      },

      TryStatement() { stats.tryCatchCount++; },
      ThrowStatement() { stats.throwCount++; },

      CatchClause(node) {
        if (node.body && node.body.body && node.body.body.length === 0) {
          stats.emptyCatchCount++;
        }
      },

      AwaitExpression() { stats.awaitCount++; },

      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'then') {
          stats.thenCount++;
        }
        // Count callback patterns (function expression as last argument)
        const lastArg = node.arguments[node.arguments.length - 1];
        if (lastArg && (lastArg.type === 'FunctionExpression' || lastArg.type === 'ArrowFunctionExpression')) {
          stats.callbackCount++;
        }
      },
    });
  }

  _analyzeText(lines, stats) {
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        stats.blankLines++;
        continue;
      }

      // Comments
      if (/^\/\//.test(trimmed)) {
        stats.commentLines++;
        stats.inlineCommentCount++;
      } else if (/^\/\*|^\*/.test(trimmed)) {
        stats.commentLines++;
        stats.blockCommentCount++;
        if (/^\/\*\*/.test(trimmed)) stats.jsdocCount++;
      } else {
        stats.codeLines++;
        if (/\/\//.test(trimmed)) stats.inlineCommentCount++; // inline at end
      }

      // Line length
      stats.lineLengths.push(line.length);

      // Indentation
      const indent = line.match(/^(\s+)/);
      if (indent) {
        stats.indentSizes.push(indent[1].length);
      }

      // Semicolons
      if (/;\s*$/.test(trimmed) || /;\s*\/\//.test(trimmed)) {
        stats.semicolonLines++;
      } else if (trimmed.length > 3 && !/^[{})\]\/\*]/.test(trimmed) && !/^(if|else|for|while|function|class|import|export|return|const|let|var|try|catch|switch|case|default|break|continue)\b/.test(trimmed)) {
        stats.nonSemicolonLines++;
      }
    }
  }

  _normalizeStats(stats) {
    const totalDecls = stats.constCount + stats.letCount + stats.varCount || 1;
    const totalFuncs = stats.arrowCount + stats.funcDeclCount + stats.funcExprCount || 1;
    const totalDepth = stats.depthCounts.reduce((a, b) => a + b, 0) || 1;
    const totalAsync = stats.awaitCount + stats.thenCount || 1;
    const avgIdLen = stats.identifiers.length > 0
      ? stats.identifiers.reduce((s, id) => s + id.length, 0) / stats.identifiers.length : 8;
    const avgFuncLen = stats.functionLengths.length > 0
      ? stats.functionLengths.reduce((a, b) => a + b, 0) / stats.functionLengths.length : 5;
    const sortedLengths = [...stats.lineLengths].sort((a, b) => a - b);
    const p90Idx = Math.floor(sortedLengths.length * 0.9);

    // Detect indent unit
    const indentFreqs = {};
    for (const size of stats.indentSizes) {
      indentFreqs[size] = (indentFreqs[size] || 0) + 1;
    }
    const commonIndent = Object.entries(indentFreqs)
      .sort((a, b) => b[1] - a[1])[0];
    const indentUnit = commonIndent ? parseInt(commonIndent[0]) : 2;

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      sampleCount: 1,
      dimensions: {
        naming: {
          camelCaseRatio: stats.totalIdCount > 0 ? stats.camelCount / stats.totalIdCount : 0.5,
          snakeCaseRatio: stats.totalIdCount > 0 ? stats.snakeCount / stats.totalIdCount : 0,
          pascalCaseRatio: stats.totalIdCount > 0 ? stats.pascalCount / stats.totalIdCount : 0,
          avgIdentifierLength: avgIdLen,
          singleLetterRatio: stats.totalIdCount > 0 ? stats.singleLetterCount / stats.totalIdCount : 0,
        },
        declarations: {
          constRatio: stats.constCount / totalDecls,
          letRatio: stats.letCount / totalDecls,
          varRatio: stats.varCount / totalDecls,
        },
        functions: {
          arrowRatio: stats.arrowCount / totalFuncs,
          avgLength: avgFuncLen,
          maxLength: stats.functionLengths.length > 0 ? Math.max(...stats.functionLengths) : 10,
        },
        structure: {
          depthHistogram: stats.depthCounts.map(c => c / totalDepth),
          avgDepth: stats.depthCounts.reduce((sum, c, i) => sum + c * i, 0) / totalDepth,
        },
        formatting: {
          indentUnit,
          avgLineLength: sortedLengths.length > 0 ? sortedLengths.reduce((a, b) => a + b, 0) / sortedLengths.length : 40,
          p90LineLength: sortedLengths[p90Idx] || 80,
          semicolonRatio: (stats.semicolonLines + stats.nonSemicolonLines) > 0
            ? stats.semicolonLines / (stats.semicolonLines + stats.nonSemicolonLines) : 0.5,
        },
        errorHandling: {
          tryCatchRatio: stats.totalFunctions > 0 ? stats.tryCatchCount / stats.totalFunctions : 0,
          emptyCatchRatio: stats.tryCatchCount > 0 ? stats.emptyCatchCount / stats.tryCatchCount : 0,
          hasThrows: stats.throwCount > 0,
        },
        asyncPatterns: {
          asyncAwaitRatio: stats.awaitCount / totalAsync,
          thenRatio: stats.thenCount / totalAsync,
          callbackCount: stats.callbackCount,
        },
        comments: {
          density: (stats.commentLines + stats.codeLines) > 0
            ? stats.commentLines / (stats.commentLines + stats.codeLines) : 0,
          jsdocPresent: stats.jsdocCount > 0,
          inlineRatio: (stats.inlineCommentCount + stats.blockCommentCount) > 0
            ? stats.inlineCommentCount / (stats.inlineCommentCount + stats.blockCommentCount) : 0.5,
        },
      },
      corrections: Object.fromEntries(DIMENSION_NAMES.map(d => [d, 1.0])),
      exceptions: [],
    };
  }

  // ==================== MERGE FINGERPRINTS ====================

  mergeFingerprints(existing, newFp) {
    const merged = JSON.parse(JSON.stringify(existing));
    const w1 = existing.sampleCount;
    const w2 = 1;
    const total = w1 + w2;

    // Weighted average for each dimension's numeric fields
    for (const dim of DIMENSION_NAMES) {
      const eDim = existing.dimensions[dim];
      const nDim = newFp.dimensions[dim];
      if (!eDim || !nDim) continue;

      for (const key of Object.keys(eDim)) {
        if (typeof eDim[key] === 'number' && typeof nDim[key] === 'number') {
          merged.dimensions[dim][key] = (eDim[key] * w1 + nDim[key] * w2) / total;
        } else if (Array.isArray(eDim[key]) && Array.isArray(nDim[key])) {
          merged.dimensions[dim][key] = eDim[key].map((v, i) =>
            (v * w1 + (nDim[key][i] || 0) * w2) / total
          );
        }
      }
    }

    merged.sampleCount = total;
    return merged;
  }

  // ==================== COMPARE ====================

  compare(fingerprint, source) {
    const newFp = this.extractFingerprint(source);
    const deviations = {};
    const details = {};

    // Per-dimension deviation
    for (const dim of DIMENSION_NAMES) {
      const ref = fingerprint.dimensions[dim];
      const cmp = newFp.dimensions[dim];
      const { deviation, detail } = this._compareDimension(dim, ref, cmp);
      const weight = fingerprint.corrections[dim] || 1.0;
      deviations[dim] = Math.min(1.0, deviation * weight);
      details[dim] = detail;
    }

    // Overall score
    const overallScore = DIMENSION_NAMES.reduce((sum, d) => sum + deviations[d], 0) / DIMENSION_NAMES.length;

    // Per-line deviations
    const perLineDeviations = this._perLineDeviations(fingerprint, source);

    // Sound params — 8 voices
    const soundParams = {
      frequencies: BASE_FREQS.slice(),
      amplitudes: DIMENSION_NAMES.map(d => Math.exp(-deviations[d] * 3)),
      vibratos: DIMENSION_NAMES.map(d => deviations[d] * 40),
      noises: DIMENSION_NAMES.map(d => deviations[d] * 0.8),
    };

    return {
      overallScore,
      deviations,
      details,
      newFingerprint: newFp,
      perLineDeviations,
      soundParams,
    };
  }

  _compareDimension(dim, ref, cmp) {
    if (!ref || !cmp) return { deviation: 0.5, detail: 'missing data' };

    let deviations = [];
    let detail = {};

    for (const key of Object.keys(ref)) {
      if (typeof ref[key] === 'number' && typeof cmp[key] === 'number') {
        const max = Math.max(Math.abs(ref[key]), Math.abs(cmp[key]), 0.01);
        const dev = Math.abs(ref[key] - cmp[key]) / max;
        deviations.push(Math.min(1, dev));
        detail[key] = { ref: ref[key], cmp: cmp[key], dev: Math.min(1, dev) };
      } else if (typeof ref[key] === 'boolean') {
        const dev = ref[key] !== cmp[key] ? 0.5 : 0;
        deviations.push(dev);
        detail[key] = { ref: ref[key], cmp: cmp[key], dev };
      } else if (Array.isArray(ref[key]) && Array.isArray(cmp[key])) {
        // Distribution comparison (sum of absolute differences / 2)
        let diffSum = 0;
        const len = Math.max(ref[key].length, cmp[key].length);
        for (let i = 0; i < len; i++) {
          diffSum += Math.abs((ref[key][i] || 0) - (cmp[key][i] || 0));
        }
        const dev = Math.min(1, diffSum / 2);
        deviations.push(dev);
        detail[key] = { dev };
      }
    }

    const avgDeviation = deviations.length > 0
      ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;

    return { deviation: avgDeviation, detail };
  }

  _perLineDeviations(fingerprint, source) {
    const lines = source.split('\n');
    const perLine = lines.map((text, i) => ({
      line: i + 1,
      text,
      deviations: [],
      severity: 0,
    }));

    const ref = fingerprint.dimensions;

    try {
      const ast = acorn.parse(source, {
        ecmaVersion: 2022, sourceType: 'module', locations: true,
        allowReturnOutsideFunction: true, allowImportExportEverywhere: true,
      });

      walk.simple(ast, {
        VariableDeclaration(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (node.kind === 'var' && ref.declarations.varRatio < 0.1) {
            perLine[idx].deviations.push({ dim: 'declarations', reason: `var used (ref: ${Math.round(ref.declarations.varRatio*100)}% var)` });
          }
          if (node.kind === 'let' && ref.declarations.letRatio < 0.05 && ref.declarations.constRatio > 0.8) {
            perLine[idx].deviations.push({ dim: 'declarations', reason: 'let used where const preferred' });
          }
        },

        Identifier(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;
          const name = node.name;
          if (name.length <= 1) return;

          const isSnake = /^[a-z][a-z0-9_]*$/.test(name) && name.includes('_');
          const isCamel = /^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name);

          if (isSnake && ref.naming.camelCaseRatio > 0.7) {
            perLine[idx].deviations.push({ dim: 'naming', reason: `snake_case "${name}" (ref: ${Math.round(ref.naming.camelCaseRatio*100)}% camelCase)` });
          }
          if (isCamel && ref.naming.snakeCaseRatio > 0.7) {
            perLine[idx].deviations.push({ dim: 'naming', reason: `camelCase "${name}" (ref: ${Math.round(ref.naming.snakeCaseRatio*100)}% snake_case)` });
          }
        },

        FunctionDeclaration(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (ref.functions.arrowRatio > 0.7) {
            perLine[idx].deviations.push({ dim: 'functions', reason: `function declaration (ref: ${Math.round(ref.functions.arrowRatio*100)}% arrows)` });
          }

          const len = node.loc.end.line - node.loc.start.line;
          if (len > ref.functions.avgLength * 2.5) {
            perLine[idx].deviations.push({ dim: 'functions', reason: `${len} lines long (ref avg: ${Math.round(ref.functions.avgLength)})` });
          }
        },

        ArrowFunctionExpression(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (ref.functions.arrowRatio < 0.2) {
            perLine[idx].deviations.push({ dim: 'functions', reason: `arrow function (ref: ${Math.round((1-ref.functions.arrowRatio)*100)}% traditional)` });
          }
        },

        CatchClause(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (node.body.body.length === 0 && ref.errorHandling.emptyCatchRatio < 0.1) {
            perLine[idx].deviations.push({ dim: 'errorHandling', reason: 'empty catch block' });
          }
        },

        // ===== SEMANTIC: Math.random() in assignments =====
        AssignmentExpression(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (_containsRandom(node.right)) {
            const target = _targetName(node.left);
            if (/freq/i.test(target)) {
              perLine[idx].deviations.push({ dim: 'structure', reason: 'Math.random() drives frequency — non-deterministic audio' });
            } else if (/gain|amp|volume/i.test(target)) {
              perLine[idx].deviations.push({ dim: 'structure', reason: 'Math.random() drives amplitude — no error mapping' });
            } else {
              perLine[idx].deviations.push({ dim: 'structure', reason: `Math.random() assigned to ${target} — non-deterministic` });
            }
          }
        },

        // ===== SEMANTIC: setValueAtTime without ramp =====
        CallExpression(node) {
          if (!node.loc) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          const callee = node.callee;
          if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
            const method = callee.property.name;

            if (method === 'setValueAtTime') {
              // Check for random value
              if (node.arguments.length > 0 && _containsRandom(node.arguments[0])) {
                perLine[idx].deviations.push({ dim: 'structure', reason: 'setValueAtTime with Math.random() — no mathematical mapping' });
              }
              // Check for missing ramp (causes clicks)
              const nearbyCode = lines.slice(Math.max(0, idx), Math.min(lines.length, idx + 3)).join('\n');
              if (!/linearRamp|exponentialRamp|cancelScheduledValues/.test(nearbyCode)) {
                perLine[idx].deviations.push({ dim: 'errorHandling', reason: 'setValueAtTime without ramp — causes audio clicks' });
              }
            }

            // setInterval without clearInterval
            if (method === 'setInterval' || (callee.type === 'Identifier' && callee.name === 'setInterval')) {
              const allCode = lines.join('\n');
              if (!/clearInterval/.test(allCode)) {
                perLine[idx].deviations.push({ dim: 'errorHandling', reason: 'setInterval without clearInterval — memory leak' });
              }
            }
          }

          // Top-level setInterval check
          if (callee.type === 'Identifier' && callee.name === 'setInterval') {
            const allCode = lines.join('\n');
            if (!/clearInterval/.test(allCode)) {
              perLine[idx].deviations.push({ dim: 'errorHandling', reason: 'setInterval without clearInterval — memory leak' });
            }
          }
        },

        // ===== SEMANTIC: random variable init =====
        VariableDeclarator(node) {
          if (!node.loc || !node.init) return;
          const idx = node.loc.start.line - 1;
          if (idx < 0 || idx >= perLine.length) return;

          if (_containsRandom(node.init)) {
            const name = node.id.type === 'Identifier' ? node.id.name : '?';
            if (/freq/i.test(name)) {
              perLine[idx].deviations.push({ dim: 'structure', reason: `"${name}" initialized with Math.random() — random frequency` });
            } else {
              perLine[idx].deviations.push({ dim: 'structure', reason: `"${name}" initialized with Math.random()` });
            }
          }
        },
      });
    } catch (e) {
      // Parse error — flag line if possible
    }

    // ===== SEMANTIC: Text-based deep checks =====
    const allCode = source;
    const hasError = /\berror\b|\bE\s*\(/.test(source);
    const hasGradient = /gradient|derivative|∇|nabla|dE|grad\b/i.test(source);
    const hasOptimization = /optimi|descent|converge|minimize|learning.?rate/i.test(allCode);

    // Dead computation: error is computed but never drives audio
    if (hasError) {
      let errorUsedInAudio = false;
      for (const line of lines) {
        if (/error.*freq|error.*gain|error.*amp|error.*noise|exp\s*\(\s*-\s*error/i.test(line)) {
          errorUsedInAudio = true;
        }
      }
      if (!errorUsedInAudio) {
        for (let i = 0; i < lines.length; i++) {
          if (/let\s+error|var\s+error|const\s+error|error\s*=/.test(lines[i]) &&
              !/function|param|catch/.test(lines[i])) {
            perLine[i].deviations.push({ dim: 'structure', reason: 'error computed but never used to drive sound parameters' });
          }
        }
      }
    }

    // No gradient in optimization code
    if (hasError && !hasGradient) {
      for (let i = 0; i < lines.length; i++) {
        if (/function\s+(loop|step|update|optimi)/i.test(lines[i])) {
          perLine[i].deviations.push({ dim: 'structure', reason: 'optimization loop with no gradient computation' });
        }
      }
    }

    // WRONG/FIXME/HACK comment flags
    for (let i = 0; i < lines.length; i++) {
      if (/\/\/.*\b(WRONG|HACK|FIXME|BUG|XXX)\b/i.test(lines[i])) {
        perLine[i].deviations.push({ dim: 'comments', reason: 'flagged comment: known issue' });
      }
    }

    // Text-based per-line checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Indentation check
      const indent = line.match(/^(\s+)/);
      if (indent && ref.formatting.indentUnit) {
        const size = indent[1].length;
        if (size % ref.formatting.indentUnit !== 0 && size > 0) {
          perLine[i].deviations.push({ dim: 'formatting', reason: `indent ${size} (ref unit: ${ref.formatting.indentUnit})` });
        }
      }

      // Line length check
      if (line.length > ref.formatting.p90LineLength * 1.3) {
        perLine[i].deviations.push({ dim: 'formatting', reason: `${line.length} chars (ref p90: ${Math.round(ref.formatting.p90LineLength)})` });
      }

      // Semicolon
      const hasSemicolon = /;\s*$/.test(trimmed);
      if (ref.formatting.semicolonRatio > 0.8 && !hasSemicolon &&
          !/^[{})\]\/\*]/.test(trimmed) && !/^(if|else|for|while|function|class|import|export|return|try|catch|switch|case|default)\b/.test(trimmed) &&
          trimmed.length > 5) {
        perLine[i].deviations.push({ dim: 'formatting', reason: 'missing semicolon' });
      }
    }

    // Compute severity per line + per-line sound params for scan mode
    for (const pl of perLine) {
      // Deduplicate by dimension
      const seen = new Set();
      pl.deviations = pl.deviations.filter(d => {
        if (seen.has(d.dim + d.reason)) return false;
        seen.add(d.dim + d.reason);
        return true;
      });
      pl.severity = Math.min(1, pl.deviations.length * 0.25);

      // Per-line sound params: 8 voices, each deviation activates its dimension's dissonance
      const dimDevs = {};
      for (const d of pl.deviations) {
        dimDevs[d.dim] = (dimDevs[d.dim] || 0) + 0.4;
      }
      pl.soundParams = {
        frequencies: BASE_FREQS.slice(),
        amplitudes: DIMENSION_NAMES.map(d => {
          const dev = Math.min(1, dimDevs[d] || 0);
          return dev > 0 ? Math.exp(-dev * 2) * 0.6 : 0.7; // deviating = quieter
        }),
        vibratos: DIMENSION_NAMES.map(d => {
          const dev = Math.min(1, dimDevs[d] || 0);
          return dev * 35; // deviating = shaky
        }),
        noises: DIMENSION_NAMES.map(d => {
          const dev = Math.min(1, dimDevs[d] || 0);
          return dev * 0.7; // deviating = noisy
        }),
      };
    }

    return perLine;
  }

  // ==================== CORRECTIONS ====================

  applyCorrection(fingerprint, dimension, action) {
    const fp = JSON.parse(JSON.stringify(fingerprint));
    if (action === 'accept') {
      fp.corrections[dimension] = Math.max(0.1, (fp.corrections[dimension] || 1) * 0.85);
    } else if (action === 'reject') {
      fp.corrections[dimension] = Math.min(2.0, (fp.corrections[dimension] || 1) * 1.15);
    }
    return fp;
  }

  // ==================== PERSISTENCE ====================

  saveFingerprint(name, fp) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[name] = fp;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  loadFingerprint(name) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[name] || null;
  }

  listFingerprints() {
    return Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  }

  deleteFingerprint(name) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete all[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  // ==================== LLM DETECTION ====================

  detectLLM(fingerprint) {
    const d = fingerprint.dimensions;
    const signals = [];
    let score = 0;

    if (d.declarations.constRatio > 0.88) {
      signals.push('Very high const ratio (>88%) — typical of LLM-generated code');
      score += 0.25;
    }
    if (d.comments.density > 0.3) {
      signals.push('Excessive comment density (>30%) — LLMs over-document');
      score += 0.2;
    }
    if (d.functions.avgLength < 15 && d.functions.avgLength > 0) {
      signals.push('Short functions (<15 lines avg) — LLMs prefer small functions');
      score += 0.15;
    }
    if (d.errorHandling.tryCatchRatio > 0.1) {
      signals.push('High try/catch ratio — LLMs over-handle errors');
      score += 0.15;
    }
    if (d.naming.avgIdentifierLength > 14) {
      signals.push('Long identifier names (>14 avg) — LLMs use verbose naming');
      score += 0.1;
    }
    if (d.comments.jsdocPresent && d.comments.density > 0.2) {
      signals.push('JSDoc everywhere — LLMs love documentation blocks');
      score += 0.15;
    }

    return {
      isLikelyLLM: score > 0.4,
      confidence: Math.min(1, score),
      signals,
    };
  }
}

// ==================== HELPERS ====================

function _containsRandom(node) {
  if (!node) return false;
  if (node.type === 'CallExpression') {
    const c = node.callee;
    if (c.type === 'MemberExpression' &&
        c.object.type === 'Identifier' && c.object.name === 'Math' &&
        c.property.type === 'Identifier' && c.property.name === 'random') {
      return true;
    }
    return node.arguments.some(a => _containsRandom(a));
  }
  if (node.type === 'BinaryExpression') return _containsRandom(node.left) || _containsRandom(node.right);
  if (node.type === 'UnaryExpression') return _containsRandom(node.argument);
  if (node.type === 'MemberExpression') return _containsRandom(node.object);
  return false;
}

function _targetName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const prop = node.property.type === 'Identifier' ? node.property.name : '';
    return `${_targetName(node.object)}.${prop}`;
  }
  return '?';
}
