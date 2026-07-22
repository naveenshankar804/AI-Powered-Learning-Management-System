const { generateFeedback } = require('../src/aiFeedback');

describe('generateFeedback', () => {
  it('should return perfect summary if no errors or visual diffs', async () => {
    const feedback = await generateFeedback([], [], [], []);
    expect(feedback.summary).toBe('Your code passed all tests perfectly.');
    expect(feedback.difficulty_estimate).toBe('none');
    expect(feedback.suggestions).toEqual([]);
    expect(feedback.avg_diff_percentage).toBe("0.00");
  });

  it('should return appropriate feedback when there are failed tests', async () => {
    const feedback = await generateFeedback([{ hint: 'Button should be red' }], [], [], []);
    expect(feedback.summary).toBe('Your submission requires a few structural adjustments.');
    expect(feedback.difficulty_estimate).toBe('medium');
    expect(feedback.suggestions).toContain('Test Failed: Button should be red');
  });

  it('should calculate visual diff properly', async () => {
    const feedback = await generateFeedback([], [], [], [{ diffPercent: 10 }]);
    expect(feedback.summary).toBe('Significant layout and logic issues detected. Focus on core element placement first.');
    expect(feedback.difficulty_estimate).toBe('hard');
    expect(feedback.avg_diff_percentage).toBe("10.00");
  });
});
