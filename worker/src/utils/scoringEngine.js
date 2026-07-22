/**
 * Applies the grading rubrics to test results.
 */
/**
 * Applies the grading rubrics to test results.
 */
function calculatePartialScores(domResults, cssResults, a11yResults, staticValidation, rubric) {
  const scores = {
    html: 0,
    css: 0,
    js: 0,
    visual: 0,
    a11y: 0,
    quality: 0
  };

  // Merge defaults so missing rubric keys don't propagate `undefined` into scores.
  // NOTE: Quality is optional; if omitted it defaults to 0 (no effect on total).
  const defaults = { html: 20, css: 35, js: 35, visual: 10, a11y: 0, quality: 0 };
  const weights = { ...defaults, ...(rubric || {}) };

  // Calculate HTML/JS DOM assertions
  if (domResults && domResults.length > 0) {
    const passed = domResults.filter(t => t.passed).length;
    const fraction = passed / domResults.length;
    scores.html = Math.round(fraction * weights.html * 10) / 10;
    scores.js = Math.round(fraction * weights.js * 10) / 10; 
  } else {
    scores.html = weights.html;
    scores.js = weights.js;
  }

  // Calculate CSS assertions
  if (cssResults && cssResults.length > 0) {
    const passed = cssResults.filter(t => t.passed).length;
    const fraction = passed / cssResults.length;
    scores.css = Math.round(fraction * weights.css * 10) / 10;
  } else {
    scores.css = weights.css;
  }

  // Calculate Accessibility (A11y) score
  if (a11yResults && a11yResults.violations) {
    const violationsCount = a11yResults.violations.length;
    // Every violation deducts 5 points from the A11y bucket (down to 0)
    const a11yMax = Number(weights.a11y ?? 0) || 0;
    const rawA11y = Math.max(0, a11yMax - (violationsCount * 5));
    scores.a11y = Math.round(rawA11y * 10) / 10;
  } else {
    scores.a11y = Number(weights.a11y ?? 0) || 0;
  }

  // Calculate code quality score from static lint results (HTMLHint, Stylelint, ESLint).
  // This bucket is optional; if rubric doesn't define it, it stays at 0.
  const qualityMax = Number(weights.quality ?? 0) || 0;
  if (qualityMax <= 0) {
    scores.quality = 0;
  } else {
    // Backwards compatible: accept either a full results object or just the summary.
    const summary = staticValidation?.summary || staticValidation || null;
    const totalErrors = Number(summary?.totalErrors ?? summary?.errors ?? 0) || 0;
    const totalWarnings = Number(summary?.totalWarnings ?? summary?.warnings ?? 0) || 0;

    const errorPenalty = qualityMax * 0.20;   // 5 errors => zero on a 10pt bucket
    const warnPenalty = qualityMax * 0.10;    // 10 warnings => zero on a 10pt bucket
    const raw = qualityMax - (totalErrors * errorPenalty) - (totalWarnings * warnPenalty);
    scores.quality = Math.round(Math.max(0, Math.min(qualityMax, raw)) * 10) / 10;
  }

  return scores;
}

module.exports = { calculatePartialScores };
