const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const aiSummaryFile = path.join(docsDir, 'ai-summary.md');
const architectureFile = path.join(docsDir, 'architecture.json');

function analyzeRecentChanges() {
  try {
    return execSync('git log -n 5 --pretty=format:"- %s (%h)"').toString();
  } catch (error) {
    return "- Initial analysis: Repository initialized or git history unavailable.";
  }
}

async function generateDocumentation() {
  const recentChanges = analyzeRecentChanges();
  let architectureData = "Architecture data not available.";

  if (fs.existsSync(architectureFile)) {
     architectureData = fs.readFileSync(architectureFile, 'utf8');
  }

  const date = new Date().toISOString().split('T')[0];
  let md = `# AI Repository Analysis & Summary\n\n`;
  md += `*Last updated: ${date}*\n\n`;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Generating fallback documentation structure.");
    md += `> **Note:** The AI documentation agent requires an OPENAI_API_KEY to generate deep insights. The following is a fallback summary.\n\n`;

    try {
        const arch = JSON.parse(architectureData);
        md += `## Architectural Overview\n\n`;
        md += `The \`${arch.repository.name}\` repository consists of ${arch.services.length} services:\n`;
        arch.services.forEach(s => {
            md += `- **${s.name}**: depends on ${s.infraDependencies ? s.infraDependencies.join(', ') : 'nothing'}\n`;
        });

        md += `\n## Recent Code Changes\n\n`;
        md += `${recentChanges}\n\n`;

        md += `## Infrastructure\n\n`;
        arch.infrastructure.forEach(i => {
           md += `- **${i.name}** (${i.type})\n`;
        });
    } catch(e) {
        md += `Could not parse architecture data.\n`;
    }

    fs.writeFileSync(aiSummaryFile, md);
    console.log(`Fallback AI Documentation generated at ${aiSummaryFile}`);
    return;
  }

  console.log("Calling OpenAI API for architectural analysis...");
  const prompt = `
    You are an expert software architect reviewing a repository.
    Based on the following architecture JSON and recent git commits, provide a Markdown summary of the system.
    Include sections for:
    - Architectural Overview
    - Recent Code Changes (summarized)
    - Security & Configuration Highlights
    - AI Reviewer Notes (potential bottlenecks or drift)

    Architecture JSON:
    ${architectureData}

    Recent Commits:
    ${recentChanges}
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
            { role: 'system', content: 'You are an AI documentation agent. Return only the requested Markdown content.' },
            { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    md += aiContent;

    fs.writeFileSync(aiSummaryFile, md);
    console.log(`AI Documentation generated at ${aiSummaryFile}`);
  } catch (error) {
    console.error("Failed to generate AI documentation:", error);
    process.exit(1);
  }
}

generateDocumentation();
