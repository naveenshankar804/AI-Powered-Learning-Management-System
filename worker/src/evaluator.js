const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { executeDomTests } = require('./utils/domTestEngine');
const { executeCssTests } = require('./utils/cssTestEngine');
const { executeInteractions } = require('./utils/interactionEngine');
const { generateVisualDiff } = require('./utils/visualDiffEngine');
const { calculatePartialScores } = require('./utils/scoringEngine');

/**
 * Runs the student code in a sandboxed Puppeteer environment.
 */
async function evaluateSubmission(runId, submissionId, htmlCode, cssCode, jsCode, testSpec, baselines, allowedDomains = [], libraryInjections = '', job = null, mode = 'evaluate', staticValidationResults = null) {
  const startTime = Date.now();
  const consoleErrors = [];
  const runIdStr = String(runId);
  // In Docker, artifacts are mounted at `/app/artifacts`. Using `process.cwd()` keeps this
  // stable across environments (worker runs from `/app/worker`).
  const artifactsPath = path.resolve(process.cwd(), '..', 'artifacts', runIdStr);
  fs.mkdirSync(artifactsPath, { recursive: true });

  // Temporary evaluation directory (not served publicly). Used for intermediate screenshots.
  const evalTmpPath = path.join(os.tmpdir(), 'amypo-eval', runIdStr);
  fs.mkdirSync(evalTmpPath, { recursive: true });

  if (job) await job.updateProgress({ stage: 'Launching sandbox' });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const context = await browser.createBrowserContext();
  const SANDBOX_HARD_TIMEOUT_MS = Number(process.env.SANDBOX_HARD_TIMEOUT_MS || 20000); // per-stage hard timeout
  let aborted = false;

  class SandboxTimeoutError extends Error {
    constructor(stage) {
      super('Timeout/Infinite Loop');
      this.name = 'SandboxTimeoutError';
      this.stage = stage;
    }
  }

  const abortSandbox = async (reason) => {
    if (aborted) return;
    aborted = true;
    if (reason) consoleErrors.push(reason);
    try {
      const pages = await context.pages().catch(() => []);
      for (const p of pages) {
        try { await p.close({ runBeforeUnload: true }); } catch (_) {}
      }
    } catch (_) {}
    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
    try {
      const proc = browser.process && browser.process();
      if (proc && proc.pid) proc.kill('SIGKILL');
    } catch (_) {}
  };

  const withHardTimeout = async (stage, op) => {
    const ms = SANDBOX_HARD_TIMEOUT_MS;
    return await Promise.race([
      Promise.resolve().then(op),
      new Promise((_, reject) => setTimeout(() => reject(new SandboxTimeoutError(stage)), ms))
    ]);
  };

  const allowedHosts = new Set(
    (Array.isArray(allowedDomains) ? allowedDomains : [])
      .map((d) => String(d || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const isAllowedHost = (hostname) => {
    const h = String(hostname || '').toLowerCase();
    if (!h) return false;
    if (allowedHosts.has(h)) return true;
    // Allow subdomains of allowlisted hosts (e.g. cdn.jsdelivr.net -> fastly.cdn.jsdelivr.net if present).
    for (const base of allowedHosts) {
      if (h === base) return true;
      if (h.endsWith(`.${base}`)) return true;
    }
    return false;
  };

  // Kill any popup/new-window targets created via window.open.
  browser.on('targetcreated', async (t) => {
    try {
      if (t.type() !== 'page') return;
      if (!t.opener()) return; // pages we create in code have no opener
      const p = await t.page();
      if (p) await p.close({ runBeforeUnload: true });
    } catch (_) {
      // ignore
    }
  });

  const setupSandboxPage = async (p) => {
    // ====== ANTI-CHEATING SANDBOX UPGRADE ======
    await p.evaluateOnNewDocument(() => {
      // 1. Disable localStorage & sessionStorage
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('localStorage is disabled in sandbox'); } });
      Object.defineProperty(window, 'sessionStorage', { get: () => { throw new Error('sessionStorage is disabled in sandbox'); } });

      // 2. Disable service workers
      if (navigator.serviceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
      }

      // 3. Block iframes
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName, options) {
        if (tagName && tagName.toLowerCase() === 'iframe') {
          throw new Error('iframes are disabled in sandbox');
        }
        return originalCreateElement.call(document, tagName, options);
      };

      // 4. Disable eval
      window.eval = function() { throw new Error('eval() is disabled in sandbox'); };

      // 5. Block popups/new windows
      window.open = function() { throw new Error('window.open is disabled in sandbox'); };

      // 6. Prevent blocking dialogs from hanging evaluation
      window.confirm = function() { return false; };
      window.prompt = function() { return null; };
    });

    await p.setRequestInterception(true);
    p.on('request', request => {
      const raw = request.url();
      let url;
      try {
        url = new URL(raw);
      } catch (_) {
        // If URL parsing fails, block to be safe.
        request.abort();
        return;
      }

      // Allow internal pseudo-protocols.
      if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') {
        request.continue();
        return;
      }

      // Only allow http(s) requests to allowlisted CDNs.
      if ((url.protocol === 'http:' || url.protocol === 'https:') && isAllowedHost(url.hostname)) {
        request.continue();
        return;
      }

      request.abort();
    });

    // Block popups at the page level as well.
    p.on('popup', async (popup) => {
      try { await popup.close({ runBeforeUnload: true }); } catch (_) {}
    });

    // Block downloads via CDP (best-effort; varies by Chromium/Puppeteer version).
    try {
      const client = await p.target().createCDPSession();
      try {
        await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
      } catch (_) {
        await client.send('Browser.setDownloadBehavior', { behavior: 'deny' });
      }
    } catch (_) {
      // ignore
    }

    p.on('pageerror', error => consoleErrors.push(error.message));
    p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  };

  const page = await context.newPage();
  await setupSandboxPage(page);

  const buildContent = (html, css, js) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        ${libraryInjections || ''}
        <style>${css || ''}</style>
      </head>
      <body>
        ${html || ''}
        <script>
          // Intercept alerts so interaction tests can assert the click behavior without hanging the run.
          window.__alerts = [];
          window.alert = (msg) => { window.__alerts.push(String(msg)); };
        </script>
        <script>
          try { ${js || ''} } catch (e) { console.error(e); }
        </script>
      </body>
      </html>
    `;

  const disableAnimationsCss = `
    * {
      animation: none !important;
      transition: none !important;
    }
  `;

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const computeVisualScore = (diffPercent, rubric) => {
    const visualMax = Number(rubric?.visual ?? 10);
    const p = toNumber(diffPercent);
    if (p == null) return 0;

    // Default FR-6 rubric mapping (can be overridden later if spec adds custom rules).
    // <=1% => 100%, 1-3% => 80%, 3-6% => 50%, >6% => 0%
    let fraction = 0;
    if (p <= 1) fraction = 1;
    else if (p <= 3) fraction = 0.8;
    else if (p <= 6) fraction = 0.5;
    else fraction = 0;

    return Math.round(visualMax * fraction * 10) / 10;
  };

  const stabilize = async (p) => {
    // Keep this small to avoid slowing down jobs; goal is stable screenshots.
    try {
      if (job) await job.updateProgress({ stage: 'Waiting for network idle' });
      await withHardTimeout('networkidle', async () => {
        await p.waitForNetworkIdle({ idleTime: 500, timeout: 8000 });
      });
    } catch (_) {
      // If networkidle isn't available or times out, continue with a small delay.
    }
    await new Promise(r => setTimeout(r, 150));
  };

  const safeSetContent = async (p, content, stageLabel) => {
    try {
      if (job && stageLabel) await job.updateProgress({ stage: stageLabel });
      // Avoid hard-failing on network-idle for blocked/failed resources (common in sandbox).
      // We'll stabilize separately using a best-effort network idle wait.
      await withHardTimeout(stageLabel || 'setContent', async () => {
        await p.setContent(content, { timeout: 15000, waitUntil: 'load' });
      });
      await withHardTimeout('disableAnimations', async () => {
        await p.addStyleTag({ content: disableAnimationsCss });
      });
      await stabilize(p);
      return true;
    } catch (e) {
      if (e && e.name === 'SandboxTimeoutError') throw e;
      consoleErrors.push(e.name === 'TimeoutError' ? 'Timeout Exceeded' : e.message);
      return false;
    }
  };

  const sanitizeSnapshotHtml = (html) => {
    if (typeof html !== 'string' || !html.trim()) return '';

    let output = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s(?:href|src|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '');

    const snapshotStyle = `<style id="amypo-static-snapshot">${disableAnimationsCss}
html, body {
  overflow: hidden !important;
}
</style>`;

    if (/<head\b[^>]*>/i.test(output)) {
      output = output.replace(/<head\b([^>]*)>/i, `<head$1>${snapshotStyle}`);
    } else if (/<html\b[^>]*>/i.test(output)) {
      output = output.replace(/<html\b([^>]*)>/i, `<html$1><head>${snapshotStyle}</head>`);
    } else {
      output = `<html><head>${snapshotStyle}</head><body>${output}</body></html>`;
    }

    if (!/<!doctype/i.test(output)) {
      output = `<!DOCTYPE html>\n${output}`;
    }

    return output;
  };

  const captureStaticSnapshot = async (p, outputPath, stageLabel) => {
    const rawHtml = await withHardTimeout(stageLabel, async () => {
      return await p.evaluate(() => {
        const root = document.documentElement.cloneNode(true);
        const sourceNodes = [document.documentElement, ...document.documentElement.querySelectorAll('*')];
        const cloneNodes = [root, ...root.querySelectorAll('*')];

        const serializeComputedStyle = (style) => {
          let text = '';
          for (const name of Array.from(style)) {
            const value = style.getPropertyValue(name);
            if (!value) continue;
            text += `${name}:${value} !important;`;
          }
          return text;
        };

        const stripDangerousAttrs = (node) => {
          if (!(node instanceof Element)) return;
          for (const attr of Array.from(node.attributes)) {
            if (/^on/i.test(attr.name)) {
              node.removeAttribute(attr.name);
              continue;
            }

            if (/(?:href|src|xlink:href)/i.test(attr.name) && /^\s*javascript:/i.test(attr.value || '')) {
              node.removeAttribute(attr.name);
            }
          }
        };

        for (let i = 0; i < sourceNodes.length; i++) {
          const sourceNode = sourceNodes[i];
          const cloneNode = cloneNodes[i];
          if (!(cloneNode instanceof Element) || !(sourceNode instanceof Element)) continue;

          stripDangerousAttrs(cloneNode);

          if (cloneNode.tagName === 'SCRIPT') {
            cloneNode.remove();
            continue;
          }

          if (sourceNode instanceof HTMLCanvasElement && cloneNode.parentNode) {
            const img = document.createElement('img');
            try {
              img.src = sourceNode.toDataURL();
            } catch (_) {
              img.src = '';
            }
            img.alt = sourceNode.getAttribute('aria-label') || 'Canvas snapshot';
            img.setAttribute('style', serializeComputedStyle(getComputedStyle(sourceNode)));
            stripDangerousAttrs(img);
            cloneNode.replaceWith(img);
            continue;
          }

          cloneNode.setAttribute('style', serializeComputedStyle(getComputedStyle(sourceNode)));

          if (sourceNode instanceof HTMLInputElement) {
            cloneNode.setAttribute('value', sourceNode.value || '');
            if (sourceNode.checked) cloneNode.setAttribute('checked', '');
            else cloneNode.removeAttribute('checked');
          } else if (sourceNode instanceof HTMLTextAreaElement) {
            cloneNode.textContent = sourceNode.value || '';
          } else if (sourceNode instanceof HTMLSelectElement) {
            const sourceOptions = Array.from(sourceNode.options);
            const cloneOptions = cloneNode.querySelectorAll('option');
            sourceOptions.forEach((option, idx) => {
              const cloneOption = cloneOptions[idx];
              if (!cloneOption) return;
              if (option.selected) cloneOption.setAttribute('selected', '');
              else cloneOption.removeAttribute('selected');
            });
          }
        }

        root.querySelectorAll('script').forEach((node) => node.remove());

        return `<!DOCTYPE html>\n${root.outerHTML}`;
      });
    });

    fs.writeFileSync(outputPath, sanitizeSnapshotHtml(rawHtml), 'utf8');
  };

  try {
    const viewports = testSpec?.viewports || [{ name: 'desktop', width: 1366, height: 768 }];

    if (mode === 'baseline') {
      const base = testSpec?.baseline || {};
      if (!base || (!base.html && !base.css && !base.js)) {
        throw new Error('Reference solution missing: testSpec.baseline');
      }

      const outputs = [];
      for (let i = 0; i < viewports.length; i++) {
        const vp = viewports[i];
        const baselinePage = await context.newPage();
        await setupSandboxPage(baselinePage);
        await baselinePage.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

        const expectedImgName = `expected_${vp.name}.png`;
        const expectedImgPath = path.join(artifactsPath, expectedImgName);
        const expectedTmpPath = path.join(evalTmpPath, `expected-${vp.name}.png`);

        const expectedContent = buildContent(base.html, base.css, base.js);
        const ok = await safeSetContent(baselinePage, expectedContent, `Rendering reference solution (${vp.name})`);
        if (!ok) {
          await baselinePage.close().catch(() => {});
          throw new Error(`Failed to render reference solution (${vp.name})`);
        }

        await withHardTimeout(`baseline:screenshot:${vp.name}`, async () => {
          await baselinePage.screenshot({ path: expectedTmpPath, fullPage: true });
        });
        fs.copyFileSync(expectedTmpPath, expectedImgPath);
        await baselinePage.close().catch(() => {});

        outputs.push({
          viewport: vp.name,
          reference_image_path: expectedImgPath,
          expected: `/artifacts/${runIdStr}/${expectedImgName}`
        });
      }

      const execTime = Date.now() - startTime;
      return {
        mode: 'baseline',
        status: 'completed',
        question_id: testSpec?.question_id || null,
        viewports: outputs,
        timings: { puppeteer_eval: `${execTime}ms` }
      };
    }
    
    let domResults = [];
    let cssResults = [];
    let layoutHints = [];
    const visualArtifacts = [];
    let aggregatedVisualScore = 0;

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

      // Generate expected screenshot from baseline code (preferred) or baseline image (fallback).
      const expectedImgName = `expected_${vp.name}.png`;
      const expectedImgPath = path.join(artifactsPath, expectedImgName);
      const expectedTmpPath = path.join(evalTmpPath, `expected-${vp.name}.png`);
      const expectedRenderName = `expected_dom_snapshot_${vp.name}.html`;
      const expectedRenderPath = path.join(artifactsPath, expectedRenderName);
      let expectedReady = false;
      let expectedRenderReady = false;

      // STEP 2 — Load baseline image generated by trainer (preferred)
      if (testSpec?.baseline?.html || testSpec?.baseline?.css || testSpec?.baseline?.js) {
        if (job) await job.updateProgress({ stage: `Rendering expected baseline (${vp.name})` });
        const expectedContent = buildContent(testSpec?.baseline?.html, testSpec?.baseline?.css, testSpec?.baseline?.js);
        const expectedPage = await context.newPage();
        await setupSandboxPage(expectedPage);
        await expectedPage.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
        const ok = await safeSetContent(expectedPage, expectedContent, `Rendering expected baseline (${vp.name})`);
        if (ok) {
          if (testSpec?.tests?.interactions) {
            await withHardTimeout(`baseline:interactions:${vp.name}`, async () => {
              await executeInteractions(expectedPage, testSpec.tests.interactions);
            });
            await stabilize(expectedPage);
          }
          try {
            await captureStaticSnapshot(expectedPage, expectedRenderPath, `baseline:snapshot:${vp.name}`);
            expectedRenderReady = true;
          } catch (e) {
            consoleErrors.push(`Expected render snapshot could not be generated (${vp.name}).`);
            consoleErrors.push(e.message);
          }
          await expectedPage.screenshot({ path: expectedTmpPath, fullPage: true });
          fs.copyFileSync(expectedTmpPath, expectedImgPath);
          expectedReady = true;
        }
        await expectedPage.close().catch(() => {});
      }

      const baseline = baselines?.find(b => b.viewport === vp.name);
      if (!expectedReady && baseline && baseline.reference_image_path && fs.existsSync(baseline.reference_image_path)) {
        try {
          fs.copyFileSync(baseline.reference_image_path, expectedImgPath);
          fs.copyFileSync(baseline.reference_image_path, expectedTmpPath);
          expectedReady = true;
        } catch (_) {
          // leave expectedReady false and continue with a failed visual status
        }
      }

      // Render student submission
      const studentContent = buildContent(htmlCode, cssCode, jsCode);
      // STEP 1 — Capture student screenshot (disable animations + wait for stability)
      const studentOk = await safeSetContent(page, studentContent, `Rendering student submission (${vp.name})`);
      if (!studentOk) {
        visualArtifacts.push({
          viewport: vp.name,
          status: 'failed',
          expected: expectedReady ? `/artifacts/${runIdStr}/expected_${vp.name}.png` : null,
          actual: null,
          diff: null,
          diffPercent: null,
          visualScore: 0,
          hotspots: []
        });
        continue;
      }

      // Run interactions if specified
      if (testSpec?.tests?.interactions) {
        if (job) await job.updateProgress({ stage: `Running interaction tests (${vp.name})` });
        await withHardTimeout(`interactions:${vp.name}`, async () => {
          await executeInteractions(page, testSpec.tests.interactions);
        });
      }

      // Run DOM & CSS assertions on first viewport only
      if (i === 0) {
        if (testSpec?.tests?.dom) {
          if (job) await job.updateProgress({ stage: 'Running DOM tests' });
          domResults = await withHardTimeout('domTests', async () => {
            return await executeDomTests(page, testSpec.tests.dom);
          });
        }
        if (testSpec?.tests?.css) {
          if (job) await job.updateProgress({ stage: 'Running CSS tests' });
          cssResults = await withHardTimeout('cssTests', async () => {
            return await executeCssTests(page, testSpec.tests.css);
          });
        }

        // ====== CSS LAYOUT ERROR HEURISTICS ======
        layoutHints = await withHardTimeout('layoutHeuristics', async () => page.evaluate(() => {
          const hints = [];
          const containers = Array.from(document.querySelectorAll('div, section, article, main, header, footer, nav, aside.container, .wrap, .wrapper'));
          
          containers.forEach(c => {
             const style = window.getComputedStyle(c);
             // Detect missing flexbox on explicit row-like items
             if (style.display === 'block' && c.children.length > 1) {
                let isRow = true;
                let prevTop = -1;
                for (let child of c.children) {
                   const bounds = child.getBoundingClientRect();
                   if (prevTop === -1) prevTop = bounds.top;
                   else if (Math.abs(bounds.top - prevTop) > 10) { isRow = false; break; }
                }
                if (isRow && c.children.length > 1 && !style.className?.includes('flex')) {
                   hints.push(`Potential missing 'display: flex' on element masquerading as a row: <${c.tagName.toLowerCase()} class="${c.className}">`);
                }
             }
             // Overflow issues
             if (c.scrollHeight > c.clientHeight && style.overflow === 'visible') {
                hints.push(`Content overflows container without scrolling context: <${c.tagName.toLowerCase()} class="${c.className}">`);
             }
          });
          return hints;
        }));
      }

      // Capture actual screenshot
      if (job) await job.updateProgress({ stage: `Capturing screenshots (${vp.name})` });
      const actualImgName = `actual_${vp.name}.png`;
      const actualImgPath = path.join(artifactsPath, actualImgName);
      const actualTmpPath = path.join(evalTmpPath, `actual-${vp.name}.png`);
      const actualRenderName = `actual_dom_snapshot_${vp.name}.html`;
      const actualRenderPath = path.join(artifactsPath, actualRenderName);
      let actualRenderReady = false;
      try {
        await captureStaticSnapshot(page, actualRenderPath, `student:snapshot:${vp.name}`);
        actualRenderReady = true;
      } catch (e) {
        consoleErrors.push(`Student render snapshot could not be generated (${vp.name}).`);
        consoleErrors.push(e.message);
      }
      await withHardTimeout(`screenshot:${vp.name}`, async () => {
        await page.screenshot({ path: actualTmpPath, fullPage: true });
      });
      fs.copyFileSync(actualTmpPath, actualImgPath);

      // Visual Diff
      // Only score visual diff when an expected baseline exists; otherwise leave as null.
      let diffPercentage = null;
      let diffHotspots = [];
      let diffHotspotsPx = [];
      let visualStatus = 'passed';
      let diffImgName = null;
      let comparisonWidth = vp.width;
      let comparisonHeight = vp.height;
      if (expectedReady && fs.existsSync(expectedImgPath)) {
        if (job) await job.updateProgress({ stage: `Computing visual diff (${vp.name})` });
        diffImgName = `diff_${vp.name}.png`;
        const diffImgPath = path.join(artifactsPath, diffImgName);
        const diffTmpPath = path.join(evalTmpPath, `diff-${vp.name}.png`);
        try {
          // Generate diff into temp evaluation dir (spec naming), then copy into served artifacts folder.
          const diffRes = await withHardTimeout(`visualDiff:${vp.name}`, async () => {
            return await generateVisualDiff(expectedTmpPath, actualTmpPath, diffTmpPath);
          });
          fs.copyFileSync(diffTmpPath, diffImgPath);
          diffPercentage = diffRes.diffPercentage;
          comparisonWidth = Number(diffRes.width) || comparisonWidth;
          comparisonHeight = Number(diffRes.height) || comparisonHeight;
          diffHotspotsPx = Array.isArray(diffRes.hotspots) ? diffRes.hotspots : [];
          // Convert pixel hotspots to percentages for the existing UI overlay.
          if (Array.isArray(diffRes.hotspots) && diffRes.width && diffRes.height) {
            diffHotspots = diffRes.hotspots.map(b => ({
              x: (b.x / diffRes.width) * 100,
              y: (b.y / diffRes.height) * 100,
              width: (b.width / diffRes.width) * 100,
              height: (b.height / diffRes.height) * 100
            }));
          } else {
            diffHotspots = [];
          }
        } catch (e) {
          visualStatus = 'failed';
          consoleErrors.push('Visual comparison could not be generated.');
          consoleErrors.push(e.message);
        }
      } else {
        visualStatus = 'failed';
      }
      
      const vpScore = visualStatus === 'passed'
        ? computeVisualScore(diffPercentage, testSpec?.rubric)
        : 0;
      aggregatedVisualScore += vpScore;

      visualArtifacts.push({
        viewport: vp.name,
        status: visualStatus,
        expected: expectedReady ? `/artifacts/${runIdStr}/expected_${vp.name}.png` : null,
        actual: `/artifacts/${runIdStr}/${actualImgName}`,
        diff: diffImgName ? `/artifacts/${runIdStr}/${diffImgName}` : null,
        expectedRender: expectedRenderReady ? `/artifacts/${runIdStr}/${expectedRenderName}` : null,
        actualRender: actualRenderReady ? `/artifacts/${runIdStr}/${actualRenderName}` : null,
        diffPercent: diffPercentage,
        visualScore: vpScore,
        viewportWidth: Number(vp.width) || null,
        viewportHeight: Number(vp.height) || null,
        comparisonWidth,
        comparisonHeight,
        hotspots: diffHotspots,
        hotspotsPx: diffHotspotsPx
      });
    }

    // 4. Accessibility Audit (A11y)
    let a11yResults = null;
    try {
      if (job) await job.updateProgress({ stage: 'a11y', message: 'Running A11y Audit...' });
      
      // Inject axe-core
      await withHardTimeout('a11y:inject', async () => {
        await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js' });
      });
      
      a11yResults = await withHardTimeout('a11y:run', async () => page.evaluate(async () => {
        return await window.axe.run();
      }));
    } catch (e) {
      console.error('A11y Audit Error:', e);
    }

    if (job) await job.updateProgress({ stage: `Calculating score` });
    const avgVisualScore = viewports.length > 0 ? aggregatedVisualScore / viewports.length : testSpec?.rubric?.visual || 10;
    const finalScores = calculatePartialScores(domResults, cssResults, a11yResults, staticValidationResults, testSpec?.rubric);
    finalScores.visual = avgVisualScore;

    const lintItems = [];
    try {
      const sv = staticValidationResults || {};
      const pushLint = (kind, items) => {
        if (!Array.isArray(items)) return;
        for (const it of items) {
          const ruleId = it?.ruleId || 'lint';
          const sev = String(it?.type || it?.severity || 'warning').toLowerCase();
          lintItems.push({
            testId: `lint:${kind}:${ruleId}`,
            selector: '',
            passed: false,
            hint: `[${kind.toUpperCase()}] ${it?.message || 'Lint issue'}`,
            severity: sev,
            line: it?.line,
            col: it?.col
          });
        }
      };
      pushLint('html', sv.html);
      pushLint('css', sv.css);
      pushLint('js', sv.js);
    } catch (_) {}

    const failedTests = [...domResults, ...cssResults].filter(r => !r.passed).concat(lintItems);

    // Optional DOM Snapshot on failure
    if (failedTests.length > 0 || avgVisualScore < (testSpec?.rubric?.visual || 10)) {
      const htmlDump = await withHardTimeout('domSnapshot', async () => page.evaluate(() => document.documentElement.outerHTML));
      fs.writeFileSync(path.join(artifactsPath, 'dom_snapshot.html'), htmlDump);
    }

    // ====== Generate PDF Report ======
    if (job) await job.updateProgress({ stage: `Generating PDF Report` });
    const totalScoreCalc = finalScores.html + finalScores.css + finalScores.js + finalScores.visual;
    const reportHtml = `
      <html><head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111827; } 
        h1 { color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; } 
        h2 { margin-top: 30px; color: #374151; }
        .score { font-size: 56px; font-weight: 900; color: ${totalScoreCalc >= 80 ? '#10b981' : '#f97316'}; }
        .metrics { display: flex; gap: 20px; font-weight: bold; margin-top: 10px; color: #4b5563; }
        ul { background: #f9fafb; padding: 20px 40px; border-radius: 8px; border: 1px solid #e5e7eb; list-style-type: square; }
        li { margin-bottom: 8px; font-family: monospace; color: #b91c1c; }
      </style>
      </head>
      <body>
        <h1>Assessment Evaluation Report</h1>
        <p>Submission ID: ${submissionId}</p>
        <div style="margin: 40px 0;">
          <span style="font-size: 14px; text-transform: uppercase; font-weight: bold; color: #6b7280;">Total Score</span><br/>
          <span class="score">${totalScoreCalc}</span> <span style="font-size: 24px; color: #9ca3af; font-weight: bold;">/ 100</span>
          <div class="metrics">
            <span>HTML: ${finalScores.html}/20</span>
            <span>CSS: ${finalScores.css}/35</span>
            <span>JS: ${finalScores.js}/35</span>
            <span>Visual: ${finalScores.visual}/10</span>
          </div>
        </div>
        
        <h2>Failed Assertions & Errors</h2>
        ${failedTests.length === 0 && consoleErrors.length === 0 && layoutHints.length === 0 ? '<p style="color: #10b981; font-weight: bold;">Perfect execution. No errors detected.</p>' : ''}
        
        ${failedTests.length > 0 ? `<h3>Failed Tests</h3><ul>${failedTests.map(t => `<li>${t.hint || t.selector}</li>`).join('')}</ul>` : ''}
        ${consoleErrors.length > 0 ? `<h3>Console Errors</h3><ul>${consoleErrors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${layoutHints.length > 0 ? `<h3>Layout Heuristics</h3><ul>${layoutHints.map(h => `<li style="color: #c2410c;">${h}</li>`).join('')}</ul>` : ''}
      </body>
      </html>
    `;
    await withHardTimeout('report:setContent', async () => {
      await page.setContent(reportHtml, { waitUntil: 'load' });
    });
    await withHardTimeout('report:pdf', async () => {
      await page.pdf({ path: path.join(artifactsPath, 'report.pdf'), format: 'A4', printBackground: true });
    });

    const execTime = Date.now() - startTime;
    const desktopArtifact = visualArtifacts.find(v => v.viewport === 'desktop') || visualArtifacts[0] || null;
    const mismatchPercent = Number(desktopArtifact?.diffPercent ?? 0);
    const mismatchPercentage = mismatchPercent; // alias for spec wording
    return {
      scores: finalScores,
      total_score: Object.values(finalScores).reduce((a, b) => a + b, 0),
      breakdown: finalScores,
      failedTests,
      consoleErrors,
      layoutHints,
      a11yViolations: a11yResults ? a11yResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        nodes: v.nodes.length
      })) : [],
      // Per-viewport visual artifacts for backend storage + UI rendering.
      visualArtifacts,
      mismatchPercent,
      mismatchPercentage,
      timings: { puppeteer_eval: `${execTime}ms` }
    };
  } catch (error) {
    if (error && error.name === 'SandboxTimeoutError') {
      await abortSandbox('Timeout/Infinite Loop');
      return {
        scores: { html: 0, css: 0, js: 0, visual: 0, a11y: 0, quality: 0 },
        failedTests: [],
        consoleErrors: [...consoleErrors, 'Timeout/Infinite Loop'],
        layoutHints: [],
        visualArtifacts: [],
        mismatchPercent: 0,
        mismatchPercentage: 0,
        timings: {}
      };
    }

    consoleErrors.push(error.name === 'TimeoutError' ? 'Timeout Exceeded' : error.message);
    const fallbackRubric = testSpec?.rubric || { html: 20, css: 35, js: 35, visual: 10 };
    return { 
      scores: { html: 0, css: 0, js: 0, visual: 0, a11y: 0, quality: 0 }, 
      failedTests: [], 
      consoleErrors,
      layoutHints: [],
      visualArtifacts: [], 
      timings: {} 
    };
  } finally {
    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
  }
}

module.exports = { evaluateSubmission };
