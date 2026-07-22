const { HTMLHint } = require('htmlhint');
const stylelint = require('stylelint');
const espree = require('espree');
const eslintPkg = require('eslint');
const { Linter } = eslintPkg;

class StaticValidationService {
  async validateSetup(htmlCode, cssCode, jsCode) {
    const results = {
      html: [],
      css: [],
      js: [],
      summary: {
        html: { errors: 0, warnings: 0 },
        css: { errors: 0, warnings: 0 },
        js: { errors: 0, warnings: 0 },
        totalErrors: 0,
        totalWarnings: 0
      },
      isValid: true // Critically invalid syntax will set this to false
    };

    // 1. Validate HTML
    if (htmlCode) {
      const htmlErrors = HTMLHint.verify(htmlCode, {
        'tagname-lowercase': true,
        'attr-lowercase': true,
        'attr-value-double-quotes': true,
        'tag-pair': true,
        'spec-char-escape': true,
        'id-unique': true,
        'src-not-empty': true,
        'title-require': true,
        'alt-require': true
      });
      results.html = htmlErrors.map(e => ({
        line: e.line,
        col: e.col,
        message: e.message,
        type: e.type, // 'error' or 'warning'
        ruleId: e.rule?.id || null
      }));
      // We consider HTML tag pairs missing as critical
      if (htmlErrors.some(e => e.rule.id === 'tag-pair' && e.type === 'error')) {
        results.isValid = false;
      }
      results.summary.html.errors = htmlErrors.filter(e => e.type === 'error').length;
      results.summary.html.warnings = htmlErrors.filter(e => e.type === 'warning').length;
    }

    // 2. Validate CSS
    if (cssCode) {
      try {
        const cssResult = await stylelint.lint({
          code: cssCode,
          config: {
            extends: 'stylelint-config-standard'
          }
        });
        
        const warnings = cssResult?.results?.[0]?.warnings || [];
        results.css = warnings.map(w => ({
          line: w.line,
          col: w.column,
          message: w.text,
          type: w.severity, // 'error' or 'warning'
          ruleId: w.rule || null
        }));

        results.summary.css.errors = warnings.filter(w => w.severity === 'error').length;
        results.summary.css.warnings = warnings.filter(w => w.severity === 'warning').length;

        // CSS parse errors should fail fast.
        if (warnings.some(w => w.rule === 'CssSyntaxError' || String(w.text || '').includes('CssSyntaxError'))) {
          results.isValid = false;
        }
      } catch (err) {
        results.css.push({ message: err.message, type: 'error', ruleId: 'stylelint' });
        results.summary.css.errors += 1;
        results.isValid = false;
      }
    }

    // 3. Validate JS
    if (jsCode) {
      try {
        // First: syntax validation (fast fail).
        espree.parse(jsCode, { ecmaVersion: 'latest', sourceType: 'script' });

        // Then: quality lint rules using ESLint Linter (no external config files needed).
        if (typeof Linter === 'function') {
          const linter = new Linter();
          const messages = linter.verify(
            jsCode,
            {
              // ESLint (v9+) Linter.verify expects flat-config shape.
              languageOptions: {
                ecmaVersion: 'latest',
                sourceType: 'script',
                // Browser globals to avoid false-positive no-undef for DOM code.
                globals: {
                  window: 'readonly',
                  document: 'readonly',
                  alert: 'readonly',
                  console: 'readonly',
                  navigator: 'readonly',
                  location: 'readonly',
                  fetch: 'readonly',
                  setTimeout: 'readonly',
                  clearTimeout: 'readonly',
                  setInterval: 'readonly',
                  clearInterval: 'readonly',
                  requestAnimationFrame: 'readonly',
                  cancelAnimationFrame: 'readonly'
                }
              },
              rules: {
                'no-undef': 'error',
                'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: true }],
                'no-unreachable': 'error',
                'no-extra-semi': 'warn',
                'eqeqeq': 'warn'
              }
            },
            { filename: 'index.js' }
          );

          results.js = messages.map(m => ({
            line: m.line,
            col: m.column,
            message: m.message,
            type: m.severity === 2 ? 'error' : 'warning',
            ruleId: m.ruleId || null
          }));
          results.summary.js.errors = results.js.filter(x => x.type === 'error').length;
          results.summary.js.warnings = results.js.filter(x => x.type === 'warning').length;
        }
      } catch (err) {
        results.js.push({
          line: err.lineNumber,
          col: err.column,
          message: err.message,
          type: 'error',
          ruleId: err.code || 'parse-error'
        });
        results.summary.js.errors += 1;
        results.isValid = false;
      }
    }

    results.summary.totalErrors =
      results.summary.html.errors + results.summary.css.errors + results.summary.js.errors;
    results.summary.totalWarnings =
      results.summary.html.warnings + results.summary.css.warnings + results.summary.js.warnings;

    return results;
  }
}

module.exports = new StaticValidationService();
