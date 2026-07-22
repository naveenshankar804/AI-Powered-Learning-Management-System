const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

function analyzeRepository() {
  const architecture = {
    repository: {
      name: path.basename(rootDir),
      workspaces: []
    },
    techStack: new Set(),
    services: [],
    infrastructure: []
  };

  const packageJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    architecture.repository.name = rootPkg.name || architecture.repository.name;
    if (rootPkg.workspaces) {
      architecture.repository.workspaces = rootPkg.workspaces;
    }
  }

  // Parse docker-compose if exists to find infrastructure and dependencies
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const serviceDependencies = {}; // { serviceName: [dep1, dep2] }

  if (fs.existsSync(dockerComposePath)) {
    const composeContent = fs.readFileSync(dockerComposePath, 'utf8');

    // Very basic regex parsing for docker-compose services and depends_on
    const lines = composeContent.split('\n');
    let currentService = null;
    let inDependsOn = false;

    lines.forEach(line => {
      const serviceMatch = line.match(/^  ([a-zA-Z0-9_-]+):/);
      if (serviceMatch && !line.includes('depends_on')) {
        currentService = serviceMatch[1];
        inDependsOn = false;
      }

      if (currentService) {
        // Identify infrastructure by common image names
        if (line.includes('image: postgres')) {
            if(!architecture.infrastructure.find(i => i.name === currentService)) {
              architecture.infrastructure.push({ name: currentService, type: 'PostgreSQL' });
            }
        } else if (line.includes('image: redis')) {
            if(!architecture.infrastructure.find(i => i.name === currentService)) {
               architecture.infrastructure.push({ name: currentService, type: 'Redis' });
            }
        }

          if (line.trim() === 'depends_on:') {
              inDependsOn = true;
          } else if (inDependsOn) {
              const depMatch = line.match(/^      - ([a-zA-Z0-9_-]+)/) || line.match(/^      ([a-zA-Z0-9_-]+):/);
              if (depMatch) {
                  if (!serviceDependencies[currentService]) serviceDependencies[currentService] = [];
                  if (!serviceDependencies[currentService].includes(depMatch[1])) {
                      serviceDependencies[currentService].push(depMatch[1]);
                  }
              } else if (!line.trim().startsWith('-') && !line.trim().startsWith('condition') && line.trim() !== '') {
                  if(!line.match(/^      [a-zA-Z0-9_-]+:/)) {
                    inDependsOn = false;
                  }
              }
          }
      }
    });
  }

  // Scan workspaces or directories if no workspaces defined
  const dirsToScan = architecture.repository.workspaces.length > 0
        ? architecture.repository.workspaces
        : fs.readdirSync(rootDir).filter(file => fs.statSync(path.join(rootDir, file)).isDirectory() && !file.startsWith('.') && file !== 'node_modules');

  dirsToScan.forEach(workspace => {
    const workspacePath = path.join(rootDir, workspace);
    const workspacePkgPath = path.join(workspacePath, 'package.json');

    if (fs.existsSync(workspacePkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(workspacePkgPath, 'utf8'));

      const serviceInfo = {
        name: workspace,
        description: pkg.description || '',
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
        scripts: pkg.scripts || {},
        infraDependencies: serviceDependencies[workspace] || []
      };

      architecture.services.push(serviceInfo);

      // Collect tech stack
      serviceInfo.dependencies.forEach(dep => architecture.techStack.add(dep));
      serviceInfo.devDependencies.forEach(dep => architecture.techStack.add(dep));
    }
  });

  // Convert Set to Array for JSON serialization
  architecture.techStack = Array.from(architecture.techStack).sort();

  // Ensure docs dir exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'architecture.json');
  fs.writeFileSync(outputPath, JSON.stringify(architecture, null, 2));
  console.log(`Repository analysis complete. Architecture map saved to ${outputPath}`);
}

analyzeRepository();
