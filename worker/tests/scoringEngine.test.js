const { calculatePartialScores } = require('../src/utils/scoringEngine');

describe('Scoring Engine', () => {
  it('should calculate full scores when all tests pass', () => {
    const domResults = [{ passed: true }, { passed: true }];
    const cssResults = [{ passed: true }];
    const a11yResults = { violations: [] };
    const staticValidation = { summary: { totalErrors: 0, totalWarnings: 0 } };
    const rubric = { html: 20, css: 30, js: 30, a11y: 10, quality: 10 };

    const scores = calculatePartialScores(domResults, cssResults, a11yResults, staticValidation, rubric);

    expect(scores.html).toBe(20);
    expect(scores.js).toBe(30);
    expect(scores.css).toBe(30);
    expect(scores.a11y).toBe(10);
    expect(scores.quality).toBe(10);
  });

  it('should calculate partial scores when some tests fail', () => {
    const domResults = [{ passed: true }, { passed: false }];
    const cssResults = [{ passed: true }, { passed: true }, { passed: false }, { passed: false }];
    const a11yResults = { violations: [{}, {}] }; // 2 violations = -10 points
    const staticValidation = { summary: { totalErrors: 1, totalWarnings: 2 } }; // -20% of 10 = -2, -10% of 10 * 2 = -2 => -4 => 6
    const rubric = { html: 20, css: 40, js: 20, a11y: 20, quality: 10 };

    const scores = calculatePartialScores(domResults, cssResults, a11yResults, staticValidation, rubric);

    expect(scores.html).toBe(10); // 50%
    expect(scores.js).toBe(10); // 50%
    expect(scores.css).toBe(20); // 50%
    expect(scores.a11y).toBe(10); // 20 - 10
    expect(scores.quality).toBe(6); // 10 - 2 (error) - 2 (warnings)
  });

  it('should use default rubric if not provided', () => {
    const scores = calculatePartialScores([], [], null, null, null);
    expect(scores.html).toBe(20);
    expect(scores.css).toBe(35);
    expect(scores.js).toBe(35);
    expect(scores.a11y).toBe(0);
    expect(scores.quality).toBe(0);
  });
});
