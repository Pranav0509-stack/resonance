/**
 * CODE ANALYZER — Deep semantic analysis using Acorn AST
 *
 * Two layers of analysis:
 *   LAYER 1 — Structural: nesting, complexity, line length
 *   LAYER 2 — Semantic: dead code, randomness in logic, missing patterns,
 *             unused computations, audio anti-patterns, control flow issues
 *
 * The analyzer doesn't just check syntax — it checks whether the code
 * is doing what it SHOULD be doing. A line of syntactically valid code
 * can still be deeply wrong.
 */

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const BLOCK_TYPES = new Set([
  'IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement',
  'ForInStatement', 'ForOfStatement', 'SwitchCase', 'TryStatement',
  'ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration',
]);

const HEAVY_NODES = {
  ConditionalExpression: 3,
  LogicalExpression: 2,
  BinaryExpression: 1,
  AssignmentExpression: 1,
  CallExpression: 1,
  NewExpression: 1,
  UpdateExpression: 1,
};

export class CodeAnalyzer {
  analyze(source) {
    const rawLines = source.split('\n');
    const lineCount = rawLines.length;

    const lines = rawLines.map((text, i) => ({
      line: i + 1,
      text,
      metrics: {
        nestingDepth: 0,
        lineLength: text.trimEnd().length,
        cognitiveWeight: 0,
        smells: [],
      },
      error: 0,
      gradient: 0,
      soundParams: { frequency: 0, amplitude: 0, vibrato: 0, noise: 0 },
    }));

    let parseError = null;

    try {
      const ast = acorn.parse(source, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true,
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
      });

      // Layer 1: Structural analysis
      walk.ancestor(ast, this._buildVisitors(lines));

      // Layer 2: Semantic analysis — the deep stuff
      this._detectSmells(ast, lines, source);
      this._detectSemanticIssues(ast, lines, source);

    } catch (err) {
      parseError = err.message;
      const match = err.message.match(/\((\d+):\d+\)/);
      if (match) {
        const errLine = parseInt(match[1]) - 1;
        if (errLine >= 0 && errLine < lines.length) {
          lines[errLine].metrics.smells.push('syntax-error');
          lines[errLine].metrics.cognitiveWeight += 10;
        }
      }
    }

    // Compute error scores with higher weight on semantic smells
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].metrics;
      const isBlank = lines[i].text.trim() === '';
      const isComment = /^\s*(\/\/|\/\*|\*|<!--)/.test(lines[i].text);

      if (isBlank) {
        lines[i].error = 0.02;
      } else if (isComment) {
        // Comments with ❌ or WRONG markers get penalized
        const hasWarning = /❌|WRONG|HACK|FIXME|BUG|XXX/i.test(lines[i].text);
        lines[i].error = hasWarning ? 2.0 : 0.05;
        if (hasWarning) m.smells.push('flagged-comment');
      } else {
        const depthScore = Math.min(1, m.nestingDepth / 5);
        const lengthScore = Math.min(1, Math.max(0, (m.lineLength - 80) / 80));
        const weightScore = Math.min(1, m.cognitiveWeight / 10);

        // Semantic smells are weighted much heavier
        const semanticSmells = m.smells.filter(s =>
          ['random-in-logic', 'random-frequency', 'random-amplitude',
           'no-ramp-click', 'dead-computation', 'no-gradient',
           'reassign-random', 'global-mutation', 'no-error-handling',
           'hardcoded-audio', 'missing-cleanup', 'no-convergence',
           'eval', 'syntax-error', 'flagged-comment'].includes(s)
        );
        const syntaxSmells = m.smells.filter(s => !semanticSmells.includes(s));

        const semanticScore = Math.min(1, semanticSmells.length * 0.4);
        const syntaxScore = Math.min(1, syntaxSmells.length * 0.2);

        lines[i].error = (
          0.15 * depthScore +
          0.10 * lengthScore +
          0.15 * weightScore +
          0.35 * semanticScore +
          0.25 * syntaxScore
        ) * 10;
      }
    }

    // Gradient (rate of change between adjacent lines)
    for (let i = 0; i < lines.length; i++) {
      const prev = i > 0 ? lines[i - 1].error : lines[i].error;
      lines[i].gradient = Math.abs(lines[i].error - prev);
    }

    // Derive sound parameters
    for (let i = 0; i < lines.length; i++) {
      const E = lines[i].error;
      const grad = lines[i].gradient;

      lines[i].soundParams = {
        frequency: 150 + (i / Math.max(1, lineCount - 1)) * 600,
        amplitude: Math.exp(-E),
        vibrato: Math.min(50, grad * 15),
        noise: Math.min(1, E / 5),
      };
    }

    return { lines, parseError };
  }

  _buildVisitors(lines) {
    const visitors = {};
    const nodeTypes = [
      'IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement',
      'ForInStatement', 'ForOfStatement', 'SwitchStatement', 'SwitchCase',
      'TryStatement', 'CatchClause',
      'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
      'ConditionalExpression', 'LogicalExpression', 'BinaryExpression',
      'AssignmentExpression', 'CallExpression', 'NewExpression',
      'UpdateExpression', 'VariableDeclaration', 'ReturnStatement',
      'ThrowStatement', 'ClassDeclaration',
    ];

    for (const type of nodeTypes) {
      visitors[type] = (node, ancestors) => {
        if (!node.loc) return;
        const lineIdx = node.loc.start.line - 1;
        if (lineIdx < 0 || lineIdx >= lines.length) return;

        const depth = ancestors.filter(a => BLOCK_TYPES.has(a.type)).length;
        lines[lineIdx].metrics.nestingDepth = Math.max(
          lines[lineIdx].metrics.nestingDepth, depth
        );

        const weight = HEAVY_NODES[type] || 0;
        lines[lineIdx].metrics.cognitiveWeight += weight;
      };
    }

    return visitors;
  }

  // ==================== LAYER 2: SEMANTIC ANALYSIS ====================

  _detectSmells(ast, lines, source) {
    walk.simple(ast, {
      BinaryExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.operator === '==' || node.operator === '!=') {
          lines[idx].metrics.smells.push('loose-equality');
        }
      },

      CallExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          lines[idx].metrics.smells.push('eval');
        }
      },

      ConditionalExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (
          node.consequent.type === 'ConditionalExpression' ||
          node.alternate.type === 'ConditionalExpression'
        ) {
          lines[idx].metrics.smells.push('nested-ternary');
        }
      },

      CatchClause(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.body.body.length === 0) {
          lines[idx].metrics.smells.push('empty-catch');
        }
      },

      VariableDeclaration(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.kind === 'var') {
          lines[idx].metrics.smells.push('var-usage');
        }
      },

      Literal(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (
          typeof node.value === 'number' &&
          !Number.isNaN(node.value) &&
          ![0, 1, -1, 2, 100, 10].includes(node.value) &&
          Math.abs(node.value) > 2
        ) {
          lines[idx].metrics.smells.push('magic-number');
        }
      },
    });
  }

  /**
   * Deep semantic analysis — detects patterns that are syntactically valid
   * but logically wrong, dangerous, or indicate bad practices.
   */
  _detectSemanticIssues(ast, lines, source) {
    const rawLines = source.split('\n');

    // Track variable declarations and usages for dead-code detection
    const declared = new Map(); // name → { line, used: false }
    const assigned = new Map(); // name → [lines where assigned]

    walk.simple(ast, {
      // ===== Math.random() in assignment contexts (non-deterministic logic) =====
      AssignmentExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;

        if (_containsRandomCall(node.right)) {
          // Check what's being assigned to
          const target = _getAssignmentTarget(node.left);

          if (/freq/i.test(target)) {
            lines[idx].metrics.smells.push('random-frequency');
          } else if (/gain|amp|volume/i.test(target)) {
            lines[idx].metrics.smells.push('random-amplitude');
          } else {
            lines[idx].metrics.smells.push('random-in-logic');
          }
        }
      },

      // ===== Variable declarations with random init =====
      VariableDeclarator(node) {
        if (!node.loc || !node.init) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;

        const name = node.id.type === 'Identifier' ? node.id.name : '';
        declared.set(name, { line: idx, used: false });

        if (_containsRandomCall(node.init)) {
          if (/freq/i.test(name)) {
            lines[idx].metrics.smells.push('random-frequency');
          } else if (/gain|amp|volume/i.test(name)) {
            lines[idx].metrics.smells.push('random-amplitude');
          } else {
            lines[idx].metrics.smells.push('reassign-random');
          }
        }
      },

      // ===== Identifier usage tracking =====
      Identifier(node) {
        if (declared.has(node.name)) {
          declared.get(node.name).used = true;
        }
      },

      // ===== Audio anti-patterns =====
      CallExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;

        const callee = _getCallName(node);

        // setValueAtTime without linearRamp — causes audio clicks
        if (callee === 'setValueAtTime') {
          // Check if there's a linearRampToValueAtTime nearby (within 3 lines)
          const nearbyLines = rawLines.slice(Math.max(0, idx - 1), idx + 4).join('\n');
          if (!/linearRamp|exponentialRamp/.test(nearbyLines)) {
            lines[idx].metrics.smells.push('no-ramp-click');
          }

          // Check if the value is Math.random()
          if (node.arguments.length > 0 && _containsRandomCall(node.arguments[0])) {
            lines[idx].metrics.smells.push('random-amplitude');
          }
        }

        // frequency.setValueAtTime with random value
        if (callee === 'setValueAtTime' && rawLines[idx] && /frequency/.test(rawLines[idx])) {
          if (node.arguments.length > 0 && _containsRandomCall(node.arguments[0])) {
            lines[idx].metrics.smells.push('random-frequency');
          }
        }

        // createOscillator/createGain without .connect — orphaned node
        if (/^create(Oscillator|Gain|BiquadFilter|Analyser)$/.test(callee)) {
          const funcLines = rawLines.slice(idx, Math.min(idx + 20, rawLines.length)).join('\n');
          if (!/\.connect\(/.test(funcLines)) {
            lines[idx].metrics.smells.push('missing-cleanup');
          }
        }

        // setInterval/setTimeout with no clearInterval — potential leak
        if (callee === 'setInterval') {
          const allCode = rawLines.join('\n');
          if (!/clearInterval/.test(allCode)) {
            lines[idx].metrics.smells.push('no-cleanup-interval');
          }
        }
      },

      // ===== Function analysis: params vs usage =====
      FunctionDeclaration(node) {
        _analyzeFunctionBody(node, lines, rawLines);
      },
      FunctionExpression(node) {
        _analyzeFunctionBody(node, lines, rawLines);
      },
      ArrowFunctionExpression(node) {
        _analyzeFunctionBody(node, lines, rawLines);
      },
    });

    // ===== Global state mutation detection =====
    this._detectGlobalMutation(ast, lines, rawLines);

    // ===== Pattern detection: missing optimization logic =====
    this._detectMissingPatterns(lines, rawLines, source);
  }

  /**
   * Detect global variable reassignment inside functions
   */
  _detectGlobalMutation(ast, lines, rawLines) {
    const globalVars = new Set();

    // Collect top-level var/let declarations
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            globalVars.add(decl.id.name);
          }
        }
      }
    }

    // Find assignments to globals inside functions
    walk.ancestor(ast, {
      AssignmentExpression(node, ancestors) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;

        const inFunction = ancestors.some(a =>
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(a.type)
        );

        if (inFunction && node.left.type === 'Identifier' && globalVars.has(node.left.name)) {
          // Reassigning x = Math.random() inside a loop is especially bad
          if (_containsRandomCall(node.right)) {
            lines[idx].metrics.smells.push('global-mutation');
            lines[idx].metrics.smells.push('reassign-random');
          } else {
            lines[idx].metrics.smells.push('global-mutation');
          }
        }
      }
    });
  }

  /**
   * Detect missing patterns:
   *   - No gradient computation in optimization code
   *   - Computed error value that is never used for anything
   *   - No convergence check
   *   - Random where deterministic is needed
   */
  _detectMissingPatterns(lines, rawLines, source) {
    const allCode = source.toLowerCase();

    // If code has "error" computation but no gradient/derivative
    const hasError = /\berror\b|\bE\s*\(/.test(source);
    const hasGradient = /gradient|derivative|∇|nabla|partial|dE|grad\b/.test(source);
    const hasOptimization = /optimi|descent|converge|minimize|learning.?rate|lr\b|\bstep\b/.test(allCode);

    if (hasError && hasOptimization && !hasGradient) {
      // Find the function that does the "optimization" and flag it
      for (let i = 0; i < rawLines.length; i++) {
        if (/function\s+loop|function\s+step|function\s+update|function\s+optimi/i.test(rawLines[i])) {
          lines[i].metrics.smells.push('no-gradient');
        }
      }
    }

    // If code computes error but never uses it to update anything meaningful
    if (hasError) {
      let errorUsedInAudio = false;
      let errorUsedInUpdate = false;
      for (const line of rawLines) {
        if (/error.*frequency|error.*gain|error.*amp|error.*noise|exp\s*\(\s*-\s*error/i.test(line)) {
          errorUsedInAudio = true;
        }
        if (/error.*<|error.*>|error.*threshold|if.*error/i.test(line)) {
          errorUsedInUpdate = true;
        }
      }
      if (!errorUsedInAudio && !errorUsedInUpdate) {
        // Find where error is computed and flag as dead
        for (let i = 0; i < rawLines.length; i++) {
          if (/let\s+error|var\s+error|const\s+error|error\s*=/.test(rawLines[i]) &&
              !/function|param|catch/.test(rawLines[i])) {
            lines[i].metrics.smells.push('dead-computation');
          }
        }
      }
    }

    // If code uses Math.random() to set variables that should be deterministic
    // (inside a loop/interval that repeats)
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // x = Math.random() inside what looks like an update loop
      if (/=\s*Math\.random\(\)/.test(line)) {
        // Check if we're inside a function called by setInterval
        const inLoop = rawLines.slice(Math.max(0, i - 20), i).some(l =>
          /setInterval|requestAnimationFrame|loop|update|step|tick/.test(l)
        );
        if (inLoop && !lines[i].metrics.smells.includes('reassign-random')) {
          lines[i].metrics.smells.push('reassign-random');
        }
      }
    }

    // No convergence detection in optimization code
    if (hasOptimization) {
      const hasConvergence = /converge|threshold|epsilon|tolerance|< 0\.0|break|clearInterval/.test(source);
      if (!hasConvergence) {
        for (let i = 0; i < rawLines.length; i++) {
          if (/setInterval\s*\(/.test(rawLines[i])) {
            lines[i].metrics.smells.push('no-convergence');
          }
        }
      }
    }

    // HTML script tags (inline scripts lose module benefits)
    for (let i = 0; i < rawLines.length; i++) {
      if (/<script(?!\s+type="module")/.test(rawLines[i]) && !/src=/.test(rawLines[i])) {
        lines[i].metrics.smells.push('inline-script');
      }
      if (/<\/?html>|<\/?head>|<\/?body>|<\/?title>|<meta\s/.test(rawLines[i])) {
        // HTML mixed with JS analysis — these are structural, low weight
        lines[i].metrics.smells.push('html-in-js');
      }
    }

    // onclick inline handlers
    for (let i = 0; i < rawLines.length; i++) {
      if (/onclick\s*=/.test(rawLines[i])) {
        lines[i].metrics.smells.push('inline-handler');
      }
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

function _containsRandomCall(node) {
  if (!node) return false;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' && callee.object.name === 'Math' &&
        callee.property.type === 'Identifier' && callee.property.name === 'random') {
      return true;
    }
  }
  // Check children
  if (node.type === 'BinaryExpression') {
    return _containsRandomCall(node.left) || _containsRandomCall(node.right);
  }
  if (node.type === 'CallExpression') {
    return node.arguments.some(a => _containsRandomCall(a));
  }
  if (node.type === 'UnaryExpression') {
    return _containsRandomCall(node.argument);
  }
  if (node.type === 'MemberExpression') {
    return _containsRandomCall(node.object);
  }
  return false;
}

function _getAssignmentTarget(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const prop = node.property.type === 'Identifier' ? node.property.name : '';
    const obj = _getAssignmentTarget(node.object);
    return `${obj}.${prop}`;
  }
  return '';
}

function _getCallName(node) {
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return '';
}

function _analyzeFunctionBody(node, lines, rawLines) {
  if (!node.loc || !node.body) return;
  const startLine = node.loc.start.line - 1;
  const endLine = node.loc.end.line - 1;

  // Check function length
  const bodyLength = endLine - startLine;
  if (bodyLength > 30) {
    if (startLine >= 0 && startLine < lines.length) {
      lines[startLine].metrics.smells.push('long-function');
    }
  }

  // Check parameter count
  if (node.params && node.params.length > 4) {
    if (startLine >= 0 && startLine < lines.length) {
      lines[startLine].metrics.smells.push('too-many-params');
    }
  }
}

// ==================== SAMPLE CODE ====================

export const SAMPLES = {
  clean: {
    name: 'Clean Code',
    code: `// User authentication module
const MAX_ATTEMPTS = 3;
const TOKEN_EXPIRY = 3600;

function validateEmail(email) {
  const pattern = /^[^@]+@[^@]+\\.[^@]+$/;
  return pattern.test(email);
}

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function createUser(name, email) {
  if (!validateEmail(email)) {
    return { success: false, error: 'Invalid email' };
  }

  return {
    success: true,
    user: {
      id: Date.now(),
      name,
      email,
      createdAt: new Date(),
    },
  };
}

function authenticate(user, password) {
  const hashed = hashPassword(password);
  return hashed === user.passwordHash;
}

export { createUser, authenticate, validateEmail };`,
  },

  messy: {
    name: 'Messy Code',
    code: `var data = []; var x = 0; var temp; var flag = true; var result = null; var i; var j; var k;

function process(input) {
  var d = eval("(" + input + ")");
  for(var i = 0; i < d.length; i++) {
    if(d[i] != null) {
      if(d[i].type == "A") {
        if(d[i].status == "active") {
          if(d[i].value > 0) {
            for(var j = 0; j < d[i].items.length; j++) {
              if(d[i].items[j].valid == true) {
                try {
                  var r = d[i].items[j].price * d[i].items[j].qty * 1.0825 * (d[i].items[j].discount == 0 ? 1 : d[i].items[j].discount > 50 ? 0.5 : 1 - d[i].items[j].discount / 100);
                  data.push(r);
                } catch(e) {}
              }
            }
          }
        }
      }
    }
  }
  return data;
}

function check(x) { return x == null ? false : x == undefined ? false : x == "" ? false : x == 0 ? false : true; }

var getValue = function(obj, path) { var parts = path.split("."); var current = obj; for(var i = 0; i < parts.length; i++) { if(current == null) return undefined; current = current[parts[i]]; } return current; }`,
  },

  mixed: {
    name: 'Mixed Quality',
    code: `// Clean section: well-structured utilities
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Messy section: the legacy data processor nobody wants to touch
var cache = {}; var _tmp; var __flag;
function processLegacyData(raw, opts, ctx, env, flags) {
  var d = eval('(' + raw + ')');
  for(var i = 0; i < d.length; i++) {
    if(d[i] != null && d[i] != undefined) {
      if(d[i].type == "order") {
        if(d[i].status == "pending" || d[i].status == "processing" || d[i].status == "review") {
          try {
            var total = d[i].qty * d[i].price * 1.0825 * (d[i].discount == 0 ? 1 : d[i].discount > 50 ? 0.5 : 1 - d[i].discount / 100);
            cache[d[i].id] = { total: total, processed: true, timestamp: Date.now(), flag: __flag ? true : false };
          } catch(e) {}
        }
      }
    }
  }
  return cache;
}

// Clean section again: proper error handling
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.headers = { 'Content-Type': 'application/json' };
  }

  async get(path) {
    const response = await fetch(this.baseUrl + path, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(\`API error: \${response.status}\`);
    }

    return response.json();
  }

  async post(path, body) {
    const response = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(\`API error: \${response.status}\`);
    }

    return response.json();
  }
}

export { clamp, lerp, debounce, ApiClient };`,
  },

  wrong_solver: {
    name: 'Wrong Solver',
    code: `let audioCtx, oscillator, gainNode;
let x = Math.random() * 10;

function E(x) {
  return (x - 5) ** 2;
}

function start() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();

  setInterval(loop, 200);
}

function loop() {
  let error = E(x);

  // WRONG: random update (no optimization)
  x = Math.random() * 10;

  // WRONG: random pitch mapping
  let freq = Math.random() * 1000;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

  // WRONG: amplitude unrelated to error
  gainNode.gain.setValueAtTime(Math.random(), audioCtx.currentTime);

  // WRONG: ignores gradient completely
  // WRONG: no continuity, jumps everywhere
}`,
  },
};
