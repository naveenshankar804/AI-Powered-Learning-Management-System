const fs = require('fs');
const path = require('path');
const { Baseline } = require('../models');
const { enqueueBaseline } = require('./queueService');

function normalizeCode(value) {
  return typeof value === 'string' ? value : '';
}

function hasExplicitBaseline(spec = {}) {
  const baseline = spec?.baseline;
  if (!baseline || typeof baseline !== 'object') return false;

  return ['html', 'css', 'js'].some((key) => normalizeCode(baseline[key]).trim().length > 0);
}

function hasMeaningfulFallback(files = {}) {
  const html = normalizeCode(files?.html);
  const css = normalizeCode(files?.css);
  const js = normalizeCode(files?.js);

  if (css.trim().length > 0 || js.trim().length > 0) return true;

  const compactHtml = html.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!compactHtml) return false;
  if (compactHtml.includes('start styling here')) return false;

  return compactHtml.length > 0;
}

function prepareAutoBaselineSpec(spec = {}, fallbackFiles = {}) {
  const nextSpec = spec && typeof spec === 'object' ? { ...spec } : {};

  if (hasExplicitBaseline(nextSpec)) {
    return {
      spec: nextSpec,
      ready: true,
      autoFilled: false
    };
  }

  if (!hasMeaningfulFallback(fallbackFiles)) {
    return {
      spec: nextSpec,
      ready: false,
      autoFilled: false
    };
  }

  nextSpec.baseline = {
    html: normalizeCode(fallbackFiles?.html),
    css: normalizeCode(fallbackFiles?.css),
    js: normalizeCode(fallbackFiles?.js)
  };

  return {
    spec: nextSpec,
    ready: true,
    autoFilled: true
  };
}

async function resolveCurrentBaselineVersion(questionId) {
  const questionIdNum = Number(questionId);
  if (!questionIdNum) return 0;

  const currentMaxDb = await Baseline.max('version', { where: { question_id: questionIdNum } });

  let currentMaxFs = 0;
  try {
    const baseDir = path.resolve(__dirname, '..', '..', '..', 'artifacts', 'baselines', `q${questionIdNum}`);
    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const match = /^v(\d+)$/i.exec(entry.name);
        if (match) currentMaxFs = Math.max(currentMaxFs, Number(match[1]) || 0);
      }
    }
  } catch (_) {
    // Ignore artifact volume read failures.
  }

  return Math.max(Number(currentMaxDb) || 0, currentMaxFs);
}

async function resolveNextBaselineVersion(questionId) {
  const current = await resolveCurrentBaselineVersion(questionId);
  return current + 1;
}

async function queueInitialBaselineIfReady(questionId, spec = {}, fallbackFiles = {}) {
  const prepared = prepareAutoBaselineSpec(spec, fallbackFiles);
  const currentVersion = await resolveCurrentBaselineVersion(questionId);

  if (!prepared.ready || currentVersion > 0) {
    return {
      queued: false,
      version: currentVersion || null,
      jobId: null,
      autoFilled: prepared.autoFilled,
      spec: prepared.spec
    };
  }

  const nextVersion = currentVersion + 1;
  const job = await enqueueBaseline(questionId, nextVersion);

  return {
    queued: true,
    version: nextVersion,
    jobId: job?.id || null,
    autoFilled: prepared.autoFilled,
    spec: prepared.spec
  };
}

module.exports = {
  prepareAutoBaselineSpec,
  resolveCurrentBaselineVersion,
  resolveNextBaselineVersion,
  queueInitialBaselineIfReady
};
