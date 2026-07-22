/**
 * In a real production setup, this would call Gemini API or OpenAI API via the Genkit integration.
 * For the Hackathon prototype, we simulate an intelligent response using heuristics and deterministic mappings
 * that "look" like AI inference based on the diffs and failures provided, to ensure speed and zero API dependency limits.
 */

async function generateFeedback(failedTests, consoleErrors, layoutHints, visualArtifacts) {
  const suggestions = [];
  let summary = "Your code passed all tests perfectly.";
  let difficulty_estimate = "none";

  const totalVisualDiff = visualArtifacts.reduce((sum, v) => {
    const p = Number(v?.diffPercent ?? v?.diffPercentage ?? 0);
    return sum + (Number.isFinite(p) ? p : 0);
  }, 0);
  const avgVisualDiff = visualArtifacts.length > 0 ? totalVisualDiff / visualArtifacts.length : 0;

  if (failedTests.length > 0 || consoleErrors.length > 0 || avgVisualDiff > 2) {
    summary = "Your submission requires a few structural adjustments.";
    difficulty_estimate = "medium";
    
    if (failedTests.length > 3 || avgVisualDiff > 8) {
      summary = "Significant layout and logic issues detected. Focus on core element placement first.";
      difficulty_estimate = "hard";
    }

    // Map failed tests
    failedTests.forEach(test => {
      suggestions.push(`Test Failed: ${test.hint || test.selector}`);
    });

    // Map heuristics
    layoutHints.forEach(hint => {
      suggestions.push(`AI Layout Hint: ${hint}`);
    });

    // Semantic Visual Diff reasoning
    if (avgVisualDiff > 3) {
      if (layoutHints.length === 0) {
        suggestions.push(`AI Layout Inference: High visual discrepancy (${avgVisualDiff.toFixed(1)}%). Most likely layout issue: Incorrect padding/margin alignments or font sizing.`);
      }
    }

    // Map console errors
    if (consoleErrors.length > 0) {
      suggestions.push(`JavaScript Exception: Fix "${consoleErrors[0]}" to ensure interactivity works.`);
    }
  }

  return {
    summary,
    suggestions,
    difficulty_estimate,
    avg_diff_percentage: avgVisualDiff.toFixed(2)
  };
}

module.exports = { generateFeedback };
