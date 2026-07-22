const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const architectureFile = path.join(docsDir, 'architecture.json');
const diagramFile = path.join(docsDir, 'architecture-diagram.md');

function generateDiagram() {
  if (!fs.existsSync(architectureFile)) {
    console.error('Architecture map not found. Please run repo-analyzer.js first.');
    process.exit(1);
  }

  const architecture = JSON.parse(fs.readFileSync(architectureFile, 'utf8'));

  let md = '# System Architecture Diagrams\n\n';
  md += '*(Auto-generated based on codebase analysis)*\n\n';

  // 1. High-level Architecture
  md += '## Repository Workspaces\n\n';
  md += '```mermaid\ngraph TD;\n';

  // Root node
  md += `    Root["${architecture.repository.name}"]\n`;

  // Workspaces
  architecture.services.forEach(service => {
    const id = service.name.replace(/[^a-zA-Z0-9]/g, '_');
    md += `    ${id}["${service.name}"]\n`;
    md += `    Root --> ${id}\n`;
    md += `    click ${id} "../${service.name}" "Go to ${service.name} directory"\n`;
  });
  md += '```\n\n';

  // 2. Service Dependencies Map (Dynamic)
  md += '## Service Dependencies Map\n\n';
  md += '```mermaid\ngraph LR;\n';

  // Create infrastructure nodes
  architecture.infrastructure.forEach(infra => {
      const infraId = infra.name.replace(/[^a-zA-Z0-9]/g, '_');
      md += `    ${infraId}[(${infra.type} - ${infra.name})]\n`;
  });

  architecture.services.forEach(service => {
    const id = service.name.replace(/[^a-zA-Z0-9]/g, '_');
    md += `    ${id}["${service.name} Service"]\n`;
    md += `    click ${id} "../${service.name}" "View source"\n`;

    // Connect to infrastructure dependencies
    if (service.infraDependencies) {
        service.infraDependencies.forEach(dep => {
            const depId = dep.replace(/[^a-zA-Z0-9]/g, '_');
            md += `    ${id} -->|Uses| ${depId}\n`;
        });
    }

    // Heuristic service-to-service connections based on common patterns since
    // docker-compose doesn't capture frontend -> backend if frontend is client-side
    // This is still partially heuristic, but based on the parsed data structure
    if (service.name.includes('frontend') && architecture.services.find(s => s.name.includes('backend'))) {
        md += `    ${id} -->|HTTP API Requests| backend\n`;
    }
    if (service.name.includes('worker') && architecture.services.find(s => s.name.includes('backend'))) {
         // If worker has no explicit deps but backend exists, usually backend triggers it or they share a queue
         if(service.infraDependencies && service.infraDependencies.includes('redis')) {
            // Already connected to redis above
         }
    }
  });

  md += '```\n\n';

  // 3. Infrastructure diagram (architecture-beta)
  md += '## Infrastructure Diagram\n\n';
  md += '```mermaid\n';
  md += 'architecture-beta\n';
  md += '    group app(cloud)[Application Stack]\n';

  architecture.services.forEach(service => {
      const id = service.name.replace(/[^a-zA-Z0-9]/g, '_');
      md += `    service ${id}(server)[${service.name}] in app\n`;
  });
  architecture.infrastructure.forEach(infra => {
      const id = infra.name.replace(/[^a-zA-Z0-9]/g, '_');
      md += `    service ${id}(database)[${infra.type}] in app\n`;
  });

  // Create connections
  architecture.services.forEach(service => {
      const id = service.name.replace(/[^a-zA-Z0-9]/g, '_');
      if (service.infraDependencies) {
          service.infraDependencies.forEach(dep => {
              const depId = dep.replace(/[^a-zA-Z0-9]/g, '_');
              md += `    ${id}:R --> L:${depId}\n`;
          });
      }

      // Connect frontend to backend
      if (service.name.includes('frontend') && architecture.services.find(s => s.name.includes('backend'))) {
         md += `    ${id}:R --> L:backend\n`;
      }
  });

  md += '```\n\n';

  fs.writeFileSync(diagramFile, md);
  console.log(`Diagram generation complete. Diagrams saved to ${diagramFile}`);
}

generateDiagram();
