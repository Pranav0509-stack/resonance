/**
 * CODE ANALYZER — Per-line static analysis using Acorn AST
 *
 * Parses JavaScript and computes error metrics for each line:
 *   - Nesting depth (structural complexity)
 *   - Cognitive weight (AST node density)
 *   - Line length
 *   - Pattern smells (==, eval, magic numbers, nested ternaries, etc.)
 *
 * Output: per-line error score E(line) and derived sound parameters
 * using the same 4-layer framework as the Resonant Solver.
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
  /**
   * Analyze JavaScript source code.
   * @param {string} source - JavaScript source code
   * @returns {{ lines: LineAnalysis[], parseError: string|null }}
   */
  analyze(source) {
    const rawLines = source.split('\n');
    const lineCount = rawLines.length;

    // Initialize per-line data
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

      // Walk AST with ancestor tracking
      walk.ancestor(ast, this._buildVisitors(lines));

      // Detect smells from AST
      this._detectSmells(ast, lines, source);

    } catch (err) {
      parseError = err.message;
      // Mark the error line with high error
      const match = err.message.match(/\((\d+):\d+\)/);
      if (match) {
        const errLine = parseInt(match[1]) - 1;
        if (errLine >= 0 && errLine < lines.length) {
          lines[errLine].metrics.smells.push('syntax-error');
          lines[errLine].metrics.cognitiveWeight += 10;
        }
      }
    }

    // Compute error scores and sound params
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].metrics;
      const isBlank = lines[i].text.trim() === '';
      const isComment = /^\s*(\/\/|\/\*|\*)/.test(lines[i].text);

      if (isBlank || isComment) {
        lines[i].error = 0.05; // Tiny baseline so there's still a faint tone
      } else {
        const depthScore = Math.min(1, m.nestingDepth / 6);
        const lengthScore = Math.min(1, Math.max(0, (m.lineLength - 80) / 80));
        const weightScore = Math.min(1, m.cognitiveWeight / 12);
        const smellScore = Math.min(1, m.smells.length * 0.3);

        lines[i].error = (
          0.3 * depthScore +
          0.2 * lengthScore +
          0.3 * weightScore +
          0.2 * smellScore
        ) * 10; // Scale to 0-10 range
      }
    }

    // Compute gradient (rate of change between adjacent lines)
    for (let i = 0; i < lines.length; i++) {
      const prev = i > 0 ? lines[i - 1].error : lines[i].error;
      lines[i].gradient = Math.abs(lines[i].error - prev);
    }

    // Derive sound parameters
    for (let i = 0; i < lines.length; i++) {
      const E = lines[i].error;
      const grad = lines[i].gradient;

      lines[i].soundParams = {
        // Frequency: position in file → pitch (low at top, high at bottom)
        frequency: 150 + (i / Math.max(1, lineCount - 1)) * 600,
        // Amplitude: exp(-E) — clean = loud, messy = quiet
        amplitude: Math.exp(-E),
        // Vibrato: gradient between lines — sudden quality change = wobble
        vibrato: Math.min(50, grad * 15),
        // Noise: error level — messy = noisy
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

        // Nesting depth from ancestors
        const depth = ancestors.filter(a => BLOCK_TYPES.has(a.type)).length;
        lines[lineIdx].metrics.nestingDepth = Math.max(
          lines[lineIdx].metrics.nestingDepth, depth
        );

        // Cognitive weight
        const weight = HEAVY_NODES[type] || 0;
        lines[lineIdx].metrics.cognitiveWeight += weight;
      };
    }

    return visitors;
  }

  _detectSmells(ast, lines, source) {
    walk.simple(ast, {
      // == instead of ===
      BinaryExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.operator === '==' || node.operator === '!=') {
          lines[idx].metrics.smells.push('loose-equality');
        }
      },

      // eval() calls
      CallExpression(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          lines[idx].metrics.smells.push('eval');
        }
      },

      // Nested ternaries
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

      // Empty catch blocks
      CatchClause(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.body.body.length === 0) {
          lines[idx].metrics.smells.push('empty-catch');
        }
      },

      // var declarations (prefer let/const)
      VariableDeclaration(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (node.kind === 'var') {
          lines[idx].metrics.smells.push('var-usage');
        }
      },

      // Magic numbers (not 0, 1, -1, 2)
      Literal(node) {
        if (!node.loc) return;
        const idx = node.loc.start.line - 1;
        if (idx < 0 || idx >= lines.length) return;
        if (
          typeof node.value === 'number' &&
          !Number.isNaN(node.value) &&
          ![0, 1, -1, 2, 100, 10].includes(node.value) &&
          node.value !== Math.floor(node.value) === false &&
          Math.abs(node.value) > 2
        ) {
          lines[idx].metrics.smells.push('magic-number');
        }
      },
    });
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
};
