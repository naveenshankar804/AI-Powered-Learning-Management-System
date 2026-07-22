const { Submission, Question, EvaluationRun, Artifact, User, TestSpec } = require('../models');
const path = require('path');
const fs = require('fs');
const staticValidationService = require('../services/staticValidationService');
const { enqueueEvaluation, queueEvents } = require('../services/queueService');
const { updateStreak } = require('../utils/streakManager');

const getRequestUser = async (req) => {
  try {
    const id = req.header('x-user-id');
    if (!id) return null;
    return await User.findByPk(String(id));
  } catch (_) {
    return null;
  }
};

const requireAdmin = async (req, res) => {
  const actor = await getRequestUser(req);
  if (!actor || actor.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return actor;
};

const resolveRunForSubmission = async (submissionId, requestedRunId = null) => {
  const sid = Number(submissionId);
  if (!sid) return null;

  if (requestedRunId != null) {
    const rid = Number(requestedRunId);
    if (!rid) return null;
    const run = await EvaluationRun.findByPk(rid, { include: [Artifact] });
    if (!run) return null;
    if (Number(run.submission_id) !== sid) return null;
    return run;
  }

  return await EvaluationRun.findOne({
    where: { submission_id: sid },
    include: [Artifact],
    order: [['created_at', 'DESC'], ['id', 'DESC']]
  });
};

const SCORE_MAXIMA = { html: 20, css: 35, js: 35, visual: 10, a11y: 0, quality: 0 };

const clampScore = (value, max) => {
  const numeric = Number(value ?? 0);
  const ceiling = Number(max ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (!Number.isFinite(ceiling) || ceiling <= 0) return Math.max(0, numeric);
  return Math.max(0, Math.min(ceiling, numeric));
};

const normalizeScores = (rawScores, rubric) => {
  const maxima = { ...SCORE_MAXIMA, ...(rubric || {}) };
  return {
    html: clampScore(rawScores?.html, maxima.html),
    css: clampScore(rawScores?.css, maxima.css),
    js: clampScore(rawScores?.js, maxima.js),
    visual: clampScore(rawScores?.visual, maxima.visual),
    a11y: clampScore(rawScores?.a11y, maxima.a11y),
    quality: clampScore(rawScores?.quality, maxima.quality)
  };
};

const submitCode = async (req, res) => {
  try {
    const { question_id, student_id, html_content, css_content, js_content } = req.body;

    if (!question_id || !student_id) {
      return res.status(400).json({ error: 'question_id and student_id are required' });
    }

    // 1. Fetch Question and Inject Allowed Libraries
    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let finalHtml = html_content;
    if (question.allowed_libraries && question.allowed_libraries.length > 0) {
      const injections = question.allowed_libraries.map(lib => {
        if (lib.endsWith('.css')) return `<link rel="stylesheet" href="${lib}">`;
        if (lib.endsWith('.js')) return `<script src="${lib}"></script>`;
        return '';
      }).join('\n');
      finalHtml = `${injections}\n${html_content}`;
    }

    // 2. Run Static Validation
    const validationResults = await staticValidationService.validateSetup(finalHtml, css_content, js_content);

    // 2. Create Submission Record
    const submission = await Submission.create({
      question_id,
      student_id,
      html_content,
      css_content,
      js_content,
      status: validationResults.isValid ? 'pending' : 'failed',
      static_validation_results: validationResults
    });

    // Update streak (non-blocking)
    updateStreak(student_id).catch(err => console.error('Streak update failed:', err));

    // 3. Queue for worker if valid
    if (validationResults.isValid) {
      await enqueueEvaluation(submission.id);
    }

    return res.status(201).json({
      message: validationResults.isValid ? 'Submission queued' : 'Syntax validation failed',
      submission_id: submission.id,
      status: submission.status,
      validation: validationResults
    });

  } catch (error) {
    console.error('Submit Code Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// FR-8: Replay evaluation for the same submission (Admin-only).
const replaySubmissionEvaluation = async (req, res) => {
  try {
    const actor = await requireAdmin(req, res);
    if (!actor) return;

    const { id } = req.params; // submission id
    const submission = await Submission.findByPk(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Create a fresh EvaluationRun row and enqueue the worker with that run id.
    const run = await EvaluationRun.create({
      submission_id: submission.id,
      html_score: 0,
      css_score: 0,
      js_score: 0,
      visual_score: 0,
      quality_score: 0,
      a11y_score: 0,
      console_errors: [],
      execution_timings: {},
      ai_feedback: { summary: 'Replay queued...', suggestions: [] },
      failed_tests: [],
      visual_artifacts: [],
      a11y_violations: []
    });

    await submission.update({ status: 'pending', total_score: null });
    await enqueueEvaluation(submission.id, run.id);

    return res.json({ message: 'Replay successfully queued', submission_id: submission.id, run_id: run.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findByPk(id, {
      include: [
        {
          model: EvaluationRun,
          include: [Artifact]
        }
      ]
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    return res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listSubmissions = async (req, res) => {
  try {
    const { student_id, question_id, status, limit, offset } = req.query;

    const where = {};
    if (student_id) where.student_id = String(student_id);
    if (question_id) where.question_id = Number(question_id);
    if (status) where.status = String(status);

    const rows = await Submission.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(limit) || 50, 200),
      offset: Number(offset) || 0,
      include: [
        { model: EvaluationRun },
        { model: Question, attributes: ['id', 'title'] }
      ]
    });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmissionProgress = async (req, res) => {
  const { id } = req.params;
  const submissionId = id; // Renamed for clarity with the new interval logic
  const acceptedJobIds = new Set([String(id), `submission-${id}`]);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Start a polling interval to send status and occasional logs
  const progressInterval = setInterval(async () => {
    const currentSubmission = await Submission.findByPk(submissionId);
    if (!currentSubmission) {
      // Submission might have been deleted or not found, end stream
      res.write(`data: ${JSON.stringify({ status: 'failed', error: 'Submission not found' })}\n\n`);
      clearInterval(progressInterval);
      res.end();
      return;
    }

    if (currentSubmission.status === 'completed' || currentSubmission.status === 'failed') {
      res.write(`data: ${JSON.stringify({ status: currentSubmission.status })}\n\n`);
      clearInterval(progressInterval);
      res.end();
    } else {
      // Send a random log from current evaluation steps for HUD feel
      const logs = [
        'Analyzing DOM nodes...',
        'Computing layout tree...',
        'Comparing visual fragments...',
        'Checking reactivity...',
        'Scanning for accessibility violations...'
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      res.write(`data: ${JSON.stringify({ status: currentSubmission.status, log: randomLog })}\n\n`);
    }
  }, 1000); // Send updates every second

  const onProgress = ({ jobId, data }) => {
    if (acceptedJobIds.has(String(jobId))) {
      res.write(`data: ${JSON.stringify({ progress: data })}\n\n`);
    }
  };

  const onCompleted = ({ jobId, returnvalue }) => {
    if (acceptedJobIds.has(String(jobId))) {
      res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
      cleanup();
    }
  };

  const onFailed = ({ jobId, failedReason }) => {
    if (acceptedJobIds.has(String(jobId))) {
      res.write(`data: ${JSON.stringify({ status: 'failed', error: failedReason })}\n\n`);
      cleanup();
    }
  };

  queueEvents.on('progress', onProgress);
  queueEvents.on('completed', onCompleted);
  queueEvents.on('failed', onFailed);

  const cleanup = () => {
    queueEvents.off('progress', onProgress);
    queueEvents.off('completed', onCompleted);
    queueEvents.off('failed', onFailed);
    res.end();
  };

  req.on('close', cleanup);
};

const getSubmissionResult = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findByPk(id);

    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // If worker hasn't written a run yet, report status and let the UI keep polling.
    const run = await resolveRunForSubmission(submission.id, req.query.run_id);
    if (!run) {
      return res.json({
        status: submission.status,
        submission_id: submission.id
      });
    }

    const testSpecRow = await TestSpec.findOne({ where: { question_id: submission.question_id } });
    const rubric = testSpecRow?.spec_json?.rubric || null;

    const artifactsRoot = path.resolve(__dirname, '..', '..', '..', 'artifacts');
    const runArtifactsDir = path.join(artifactsRoot, String(run.id));

    const safeBasename = (p) => {
      if (!p) return null;
      const strP = String(p);
      // Reject path traversal attempts.
      if (strP.includes('..') || strP.includes('/') || strP.includes('\\')) return null;
      return path.basename(strP);
    };

    const artifactUrl = (filename) =>
      `/api/submissions/${submission.id}/artifacts/${encodeURIComponent(filename)}?run_id=${encodeURIComponent(String(run.id))}`;

    // Prefer run.visual_artifacts (worker output). Fall back to Artifacts table if present.
    let visualTests = [];
    if (Array.isArray(run.visual_artifacts) && run.visual_artifacts.length > 0) {
      visualTests = run.visual_artifacts.map(v => ({
        viewport: v.viewport,
        status: v.status || (v.diffPercent != null ? 'passed' : 'failed'),
        diffPercent: Number(v.diffPercent ?? 0),
        visualScore: Number(v.visualScore ?? 0),
        viewportWidth: Number(v.viewportWidth ?? 0) || null,
        viewportHeight: Number(v.viewportHeight ?? 0) || null,
        comparisonWidth: Number(v.comparisonWidth ?? 0) || null,
        comparisonHeight: Number(v.comparisonHeight ?? 0) || null,
        expected: safeBasename(v.expected) ? artifactUrl(safeBasename(v.expected)) : null,
        actual: safeBasename(v.actual) ? artifactUrl(safeBasename(v.actual)) : null,
        diff: safeBasename(v.diff) ? artifactUrl(safeBasename(v.diff)) : null,
        expectedRenderUrl: safeBasename(v.expectedRender) ? artifactUrl(safeBasename(v.expectedRender)) : null,
        actualRenderUrl: safeBasename(v.actualRender) ? artifactUrl(safeBasename(v.actualRender)) : null,
        boxes: v.hotspots || []
      }));
    } else if (Array.isArray(run.Artifacts) && run.Artifacts.length > 0) {
      // Artifacts table format: one row per viewport with expected/actual/diff image paths.
      const viewports = [...new Set(run.Artifacts.map(a => a.viewport))];
      visualTests = viewports.map(vp => {
        const acts = run.Artifacts.filter(a => a.viewport === vp);
        const row = acts[0] || {};
        const expectedName = safeBasename(row.expected_image_path);
        const actualName = safeBasename(row.actual_image_path);
        const diffName = safeBasename(row.diff_image_path);

        return {
          viewport: vp,
          status: diffName ? 'passed' : 'failed',
          diffPercent: 0,
          visualScore: 0,
          expected: expectedName ? artifactUrl(expectedName) : null,
          actual: actualName ? artifactUrl(actualName) : null,
          diff: diffName ? artifactUrl(diffName) : null,
          boxes: []
        };
      });
    }

    // Persist artifact metadata in DB (local volume storage). This is idempotent.
    // If you later switch to S3, replace these paths with bucket keys.
    try {
      const existingArtifacts = await Artifact.findAll({ where: { run_id: run.id } });
      const existingMap = new Map(existingArtifacts.map(a => [String(a.viewport), a]));
      const toCreate = [];
      const updatePromises = [];

      for (const vt of visualTests) {
        const viewport = String(vt.viewport || '');
        if (!viewport) continue;
        const expectedFile = `expected_${viewport}.png`;
        const actualFile = `actual_${viewport}.png`;
        const diffFile = `diff_${viewport}.png`;

        const next = {
          run_id: run.id,
          viewport,
          expected_image_path: fs.existsSync(path.join(runArtifactsDir, expectedFile)) ? path.join(String(run.id), expectedFile) : null,
          actual_image_path: fs.existsSync(path.join(runArtifactsDir, actualFile)) ? path.join(String(run.id), actualFile) : null,
          diff_image_path: fs.existsSync(path.join(runArtifactsDir, diffFile)) ? path.join(String(run.id), diffFile) : null
        };

        const row = existingMap.get(viewport);
        if (row) {
          updatePromises.push(row.update(next));
        } else {
          toCreate.push(next);
        }
      }

      if (updatePromises.length > 0) await Promise.all(updatePromises);
      if (toCreate.length > 0) await Artifact.bulkCreate(toCreate);
    } catch (_) {
      // Non-fatal: DB persistence shouldn't block showing results.
    }

    const desktop = visualTests.find(v => v.viewport === 'desktop') || visualTests[0] || null;
    const mismatchPercent = Number(desktop?.diffPercent ?? 0);
    const mismatchPercentage = mismatchPercent;
    const normalizedScores = normalizeScores({
      html: run.html_score,
      css: run.css_score,
      js: run.js_score,
      visual: run.visual_score,
      a11y: run.a11y_score,
      quality: run.quality_score
    }, rubric);
    const totalScore = normalizedScores.html + normalizedScores.css + normalizedScores.js + normalizedScores.visual + normalizedScores.a11y + normalizedScores.quality;

    return res.json({
      status: submission.status,
      submission_id: submission.id,
      run_id: run.id,
      total_score: totalScore,
      rubric: {
        html: Number(rubric?.html ?? SCORE_MAXIMA.html) || 0,
        css: Number(rubric?.css ?? SCORE_MAXIMA.css) || 0,
        js: Number(rubric?.js ?? SCORE_MAXIMA.js) || 0,
        visual: Number(rubric?.visual ?? SCORE_MAXIMA.visual) || 0,
        a11y: Number(rubric?.a11y ?? SCORE_MAXIMA.a11y) || 0,
        quality: Number(rubric?.quality ?? SCORE_MAXIMA.quality) || 0
      },
      scores: normalizedScores,
      breakdown: {
        dom: normalizedScores.html,
        css: normalizedScores.css,
        visual: normalizedScores.visual,
        a11y: normalizedScores.a11y,
        quality: normalizedScores.quality
      },
      a11yViolations: run.a11y_violations || [],
      mismatchPercent,
      mismatchPercentage,
      visualTests,
      failedTests: run.failed_tests || [],
      aiFeedback: run.ai_feedback || { summary: 'No AI feedback generated.', suggestions: [] },
      visualArtifacts: desktop
        ? {
            expected: desktop.expected || null,
            actual: desktop.actual || null,
            diff: desktop.diff || null,
            expectedRenderUrl: desktop.expectedRenderUrl || null,
            actualRenderUrl: desktop.actualRenderUrl || null,
            comparisonWidth: desktop.comparisonWidth || null,
            comparisonHeight: desktop.comparisonHeight || null,
            boxes: desktop.boxes || []
          }
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmissionArtifact = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const strFilename = String(filename || '');
    if (strFilename.includes('..') || strFilename.includes('/') || strFilename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }
    const safeName = path.basename(strFilename);
    if (!safeName) return res.status(400).send('Invalid filename');

    const submission = await Submission.findByPk(id);
    if (!submission) return res.status(404).send('Submission not found');
    const run = await resolveRunForSubmission(submission.id, req.query.run_id);
    if (!run) return res.status(404).send('Artifacts not ready');

    // Allow only known artifact file types; prevents probing arbitrary files on the volume.
    const allowed =
      safeName === 'dom_snapshot.html' ||
      safeName === 'report.pdf' ||
      /^expected_dom_snapshot_[a-z0-9_-]+\.html$/i.test(safeName) ||
      /^actual_dom_snapshot_[a-z0-9_-]+\.html$/i.test(safeName) ||
      /^expected_[a-z0-9_-]+\.png$/i.test(safeName) ||
      /^actual_[a-z0-9_-]+\.png$/i.test(safeName) ||
      /^diff_[a-z0-9_-]+\.png$/i.test(safeName);
    if (!allowed) return res.status(403).send('Forbidden');

    const artifactsRoot = path.resolve(__dirname, '..', '..', '..', 'artifacts');
    const runDir = path.join(artifactsRoot, String(run.id));
    const abs = path.resolve(runDir, safeName);
    if (!abs.startsWith(runDir)) return res.status(403).send('Forbidden');
    if (!fs.existsSync(abs)) return res.status(404).send('Not found');

    // Cache immutable run artifacts for a short time.
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (/\.html$/i.test(safeName)) {
      res.type('html');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'none'",
          "script-src 'none'",
          "connect-src 'none'",
          "object-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'self'",
          "style-src 'unsafe-inline' https: data:",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data: https: http:",
          "media-src 'self' data: https: http:",
          'sandbox'
        ].join('; ')
      );
      return res.send(fs.readFileSync(abs, 'utf8'));
    }

    return res.sendFile(abs);
  } catch (e) {
    return res.status(500).send('Server error');
  }
};

module.exports = {
  submitCode,
  listSubmissions,
  getSubmissionStatus,
  replaySubmissionEvaluation,
  getSubmissionProgress,
  getSubmissionResult,
  getSubmissionArtifact
};
