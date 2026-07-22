const fs = require('fs');
const path = require('path');

const reportsDir = path.resolve(__dirname, '..', 'reports');

function parseReports() {
  const data = {
    eslint: null,
    knip: null,
    jscpd: null,
    secretlint: null,
    audit: null,
    prettier: null,
    tsc: null,
  };

  try {
    if (fs.existsSync(path.join(reportsDir, 'eslint-report.json'))) {
      data.eslint = JSON.parse(fs.readFileSync(path.join(reportsDir, 'eslint-report.json'), 'utf8'));
    }
  } catch (e) {
    console.warn("Could not parse eslint report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'knip-report.json'))) {
      const content = fs.readFileSync(path.join(reportsDir, 'knip-report.json'), 'utf8');
      // Knip might output ndjson or a single json object, depending on the command run.
      // Assuming --reporter json outputs a valid JSON.
      data.knip = JSON.parse(content);
    }
  } catch (e) {
    console.warn("Could not parse knip report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'jscpd-report.json'))) {
      data.jscpd = JSON.parse(fs.readFileSync(path.join(reportsDir, 'jscpd-report.json'), 'utf8'));
    }
  } catch (e) {
    console.warn("Could not parse jscpd report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'secretlint-report.json'))) {
      data.secretlint = JSON.parse(fs.readFileSync(path.join(reportsDir, 'secretlint-report.json'), 'utf8'));
    }
  } catch (e) {
    console.warn("Could not parse secretlint report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'npm-audit-report.json'))) {
      data.audit = JSON.parse(fs.readFileSync(path.join(reportsDir, 'npm-audit-report.json'), 'utf8'));
    }
  } catch (e) {
    console.warn("Could not parse npm audit report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'prettier-report.txt'))) {
      data.prettier = fs.readFileSync(path.join(reportsDir, 'prettier-report.txt'), 'utf8');
    }
  } catch (e) {
    console.warn("Could not parse prettier report", e.message);
  }

  try {
    if (fs.existsSync(path.join(reportsDir, 'tsc-report.txt'))) {
      data.tsc = fs.readFileSync(path.join(reportsDir, 'tsc-report.txt'), 'utf8');
    }
  } catch (e) {
    console.warn("Could not parse tsc report", e.message);
  }

  return data;
}

function calculateScores(data) {
  // Simple synthetic metric calculation
  let qualityScore = 100;
  let securityScore = 100;
  let maintainabilityScore = 100;

  // Reduce quality score based on ESLint errors
  if (data.eslint) {
    const errorCount = data.eslint.reduce((acc, file) => acc + file.errorCount, 0);
    qualityScore -= Math.min(errorCount * 2, 50);
  }

  // Reduce quality score based on Prettier formatting errors
  if (data.prettier && data.prettier.includes('forgot to run Prettier')) {
    qualityScore -= 20;
  }

  // Reduce quality score based on TypeScript compilation errors
  if (data.tsc && data.tsc.includes('error TS')) {
    qualityScore -= 30;
  }

  // Reduce maintainability based on duplication
  if (data.jscpd && data.jscpd.statistics) {
    const dupPercentage = data.jscpd.statistics.total.percentage;
    maintainabilityScore -= Math.min(parseFloat(dupPercentage) * 2, 50);
  }

  // Reduce maintainability based on dead code
  if (data.knip && Object.keys(data.knip).length > 0) {
    maintainabilityScore -= 20;
  }

  // Reduce security score based on vulnerabilities and secrets
  if (data.audit && data.audit.metadata && data.audit.metadata.vulnerabilities) {
    const vulns = data.audit.metadata.vulnerabilities;
    const vulnPenalty = (vulns.critical * 10) + (vulns.high * 5) + (vulns.moderate * 2);
    securityScore -= Math.min(vulnPenalty, 40);
  }

  if (data.secretlint && data.secretlint.length > 0) {
    securityScore -= 50; // Heavy penalty for secrets
  }

  return {
    quality: Math.max(0, qualityScore),
    security: Math.max(0, securityScore),
    maintainability: Math.max(0, maintainabilityScore)
  };
}

async function analyzeWithAI(reportsData, scores) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Skipping AI analysis.");
    return "AI analysis skipped due to missing API key.";
  }

  const prompt = `
    You are an expert QA and Security engineer reviewing automated scan results.
    Based on the following scores and scan summaries, provide a plain English explanation of the findings,
    prioritize the top 3 issues by severity, and recommend refactoring or fixes.

    Scores:
    Quality: ${scores.quality}/100
    Security: ${scores.security}/100
    Maintainability: ${scores.maintainability}/100

    Summarized Scan Data:
    - Formatting (Prettier) passed: ${reportsData.prettier && !reportsData.prettier.includes('forgot to run Prettier') ? 'Yes' : 'No'}
    - Type Checking (TSC) passed: ${reportsData.tsc && !reportsData.tsc.includes('error TS') ? 'Yes' : 'No'}
    - Dead Code (Knip) issues: ${reportsData.knip && Object.keys(reportsData.knip).length > 0 ? 'Yes' : 'No'}
    - ESLint Files with errors: ${reportsData.eslint ? reportsData.eslint.filter(f => f.errorCount > 0).length : 'Unknown'}
    - Duplication percentage: ${reportsData.jscpd ? reportsData.jscpd.statistics?.total?.percentage + '%' : 'Unknown'}
    - Secrets detected: ${reportsData.secretlint && reportsData.secretlint.length > 0 ? 'Yes' : 'No'}
    - Vulnerabilities: ${reportsData.audit ? JSON.stringify(reportsData.audit.metadata.vulnerabilities) : 'Unknown'}
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an AI QA agent. Return clear, concise Markdown.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return "AI analysis failed due to an error.";
  }
}

async function main() {
  const data = parseReports();
  const scores = calculateScores(data);
  const aiInsights = await analyzeWithAI(data, scores);

  let md = `# AI QA Analysis Report\n\n`;
  md += `## Synthetic Scores\n\n`;
  md += `- **Code Quality Score:** ${scores.quality}/100\n`;
  md += `- **Security Score:** ${scores.security}/100\n`;
  md += `- **Maintainability Score:** ${scores.maintainability}/100\n\n`;

  md += `## AI Insights & Recommendations\n\n`;
  md += `${aiInsights}\n\n`;

  // Output to GitHub Step Summary if running in CI
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  // Generate QA Dashboard
  const docsDir = path.resolve(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  fs.writeFileSync(path.join(docsDir, 'QA_DASHBOARD.md'), md);
  console.log("QA Dashboard generated at docs/QA_DASHBOARD.md");

  // Determine if CI should fail based on strict criteria
  let failCI = false;
  if (data.secretlint && data.secretlint.length > 0) {
    console.error("❌ CRITICAL: Secrets detected in repository.");
    failCI = true;
  }
  if (scores.security < 60) {
    console.error("❌ CRITICAL: Security score below threshold (60).");
    failCI = true;
  }
  if (scores.quality < 60) {
    console.error("❌ CRITICAL: Quality score below threshold (60).");
    failCI = true;
  }

  if (failCI) {
    process.exit(1);
  } else {
    console.log("✅ All quality and security checks passed.");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseReports, calculateScores, analyzeWithAI, main };
