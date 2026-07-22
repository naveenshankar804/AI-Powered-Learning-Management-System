const { Worker } = require('bullmq');
const dotenv = require('dotenv');
const evaluator = require('./src/evaluator');
// We need access to the DB models
// Usually we'd extract models into a shared package, but for monorepo this works too:
const { Submission, EvaluationRun, TestSpec, Baseline, WhitelistDomain, Question } = require('../backend/src/models');

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

console.log('Starting Evaluation Worker...');

const SCORE_MAXIMA = { html: 20, css: 35, js: 35, visual: 10, a11y: 0, quality: 0 };

const clampScore = (value, max) => {
  const numeric = Number(value ?? 0);
  const ceiling = Number(max ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (!Number.isFinite(ceiling) || ceiling <= 0) return Math.max(0, numeric);
  return Math.max(0, Math.min(ceiling, numeric));
};

const normalizeScores = (scores, rubric) => {
  const maxima = { ...SCORE_MAXIMA, ...(rubric || {}) };
  return {
    html: clampScore(scores?.html, maxima.html),
    css: clampScore(scores?.css, maxima.css),
    js: clampScore(scores?.js, maxima.js),
    visual: clampScore(scores?.visual, maxima.visual),
    a11y: clampScore(scores?.a11y, maxima.a11y),
    quality: clampScore(scores?.quality, maxima.quality)
  };
};

const worker = new Worker('evaluation-queue', async job => {
  const mode = String(job?.data?.mode || 'evaluate');
  const submissionId = job?.data?.submissionId;
  const providedRunId = job?.data?.runId;
  const questionId = job?.data?.questionId;
  const baselineVersion = job?.data?.version;
  console.log(`Processing job ${job.id} mode=${mode} submission=${submissionId ?? '-'} question=${questionId ?? '-'}`);

  try {
    // ===== Baseline generation flow (FR-2) =====
    if (mode === 'baseline') {
      if (!questionId) throw new Error('questionId is required for baseline generation');

      const question = await Question.findByPk(questionId);
      if (!question) throw new Error('Question not found');

      const testSpecRow = await TestSpec.findOne({ where: { question_id: questionId } });
      const testSpec = testSpecRow ? testSpecRow.spec_json : null;
      if (!testSpec?.baseline) throw new Error('Reference solution missing in testSpec.baseline');

      const allowedDomainsRows = await WhitelistDomain.findAll();
      const allowedDomains = allowedDomainsRows.map(r => r.domain);

      // Build injections + allowlist from question library policy.
      let libraryInjections = '';
      if (question?.allowed_libraries && question.allowed_libraries.length > 0) {
        const injections = question.allowed_libraries.map(lib => {
          if (lib.endsWith('.css')) return `<link rel="stylesheet" href="${lib}">`;
          if (lib.endsWith('.js')) return `<script src="${lib}"></script>`;
          return '';
        }).join('\n');
        libraryInjections = injections;

        for (const lib of question.allowed_libraries) {
          try {
            const u = new URL(String(lib));
            if (u.hostname) allowedDomains.push(u.hostname);
          } catch (_) {}
        }
      }

      const version = Number(baselineVersion) || 1;
      const runId = `baselines/q${questionId}/v${version}`;
      const result = await evaluator.evaluateSubmission(
        runId,
        `baseline-q${questionId}-v${version}`,
        '',
        '',
        '',
        testSpec,
        [],
        allowedDomains,
        libraryInjections,
        job,
        'baseline'
      );

      const baselinesToCreate = (result?.viewports || []).map(vp => ({
        question_id: Number(questionId),
        viewport: vp.viewport,
        reference_image_path: vp.reference_image_path,
        version
      }));
      const created = baselinesToCreate.length > 0
        ? await Baseline.bulkCreate(baselinesToCreate, { returning: true })
        : [];

      if (job) await job.updateProgress({ stage: 'Baseline complete' });
      console.log(`Baseline generated for question ${questionId} v${version}: ${created.length} viewport(s)`);
      return { status: 'completed', version, viewports: result?.viewports || [] };
    }

    // 1. Fetch submission details
    const submission = await Submission.findByPk(submissionId);
    if (!submission) throw new Error('Submission not found');

    // Set status
    await submission.update({ status: 'running' });

    // 2. Fetch Question and TestSpec
    const question = await Question.findByPk(submission.question_id);
    const testSpecRow = await TestSpec.findOne({ where: { question_id: submission.question_id } });
    const testSpec = testSpecRow ? testSpecRow.spec_json : null;

    const baselines = await Baseline.findAll({ where: { question_id: submission.question_id } });

    const allowedDomainsRows = await WhitelistDomain.findAll();
    const allowedDomains = allowedDomainsRows.map(r => r.domain);
    
    // For now, let's just create a dummy result for the pipeline scaffold:
    let htmlCode = submission.html_content || '';
    const cssCode = submission.css_content || '';
    const jsCode = submission.js_content || '';

    // Inject allowed libraries (CDNs) into the sandbox HTML <head> before evaluation.
    // Also ensure those library hostnames are allowlisted for request interception.
    let libraryInjections = '';
    if (question?.allowed_libraries && question.allowed_libraries.length > 0) {
      const injections = question.allowed_libraries.map(lib => {
        if (lib.endsWith('.css')) return `<link rel="stylesheet" href="${lib}">`;
        if (lib.endsWith('.js')) return `<script src="${lib}"></script>`;
        return '';
      }).join('\n');
      libraryInjections = injections;

      for (const lib of question.allowed_libraries) {
        try {
          const u = new URL(String(lib));
          if (u.hostname) allowedDomains.push(u.hostname);
        } catch (_) {
          // ignore invalid URLs
        }
      }
    }

    // Use an existing run id (admin replay) or create a new run (normal submission).
    let run = null;
    if (providedRunId != null) {
      run = await EvaluationRun.findByPk(Number(providedRunId));
      if (!run) throw new Error('EvaluationRun not found for replay');
      if (Number(run.submission_id) !== Number(submissionId)) throw new Error('Replay run does not match submission');

      // Ensure a clean slate in case the row was pre-created with placeholders.
      await run.update({
        html_score: 0,
        css_score: 0,
        js_score: 0,
        visual_score: 0,
        quality_score: 0,
        console_errors: [],
        execution_timings: {},
        ai_feedback: { summary: 'Evaluation in progress...', suggestions: [] },
        failed_tests: [],
        visual_artifacts: [],
        a11y_score: 0,
        a11y_violations: []
      });
    } else {
      // Create the run first to get a stable runId for artifact storage (/artifacts/{runId}/...)
      run = await EvaluationRun.create({
        submission_id: submissionId,
        html_score: 0,
        css_score: 0,
        js_score: 0,
        visual_score: 0,
        quality_score: 0,
        console_errors: [],
        execution_timings: {},
        ai_feedback: { summary: 'Evaluation in progress...', suggestions: [] },
        failed_tests: [],
        visual_artifacts: []
      });
    }

    // 3. Execute puppeteer sandbox (writes artifacts to /artifacts/{run.id}/)
    const result = await evaluator.evaluateSubmission(
      run.id,
      submissionId,
      htmlCode,
      cssCode,
      jsCode,
      testSpec,
      baselines,
      allowedDomains,
      libraryInjections,
      job,
      'evaluate',
      submission.static_validation_results || null
    );

    // 4. Generate AI Feedback
    const { generateFeedback } = require('./src/aiFeedback');
    const feedback = await generateFeedback(
      result.failedTests || [], 
      result.consoleErrors || [], 
      result.layoutHints || [], 
      result.visualArtifacts || []
    );

    const normalizedScores = normalizeScores(result.scores, testSpec?.rubric);

    // 5. Update run in DB
    await run.update({
      html_score: normalizedScores.html,
      css_score: normalizedScores.css,
      js_score: normalizedScores.js,
      visual_score: normalizedScores.visual,
      quality_score: normalizedScores.quality,
      console_errors: result.consoleErrors,
      execution_timings: result.timings,
      ai_feedback: feedback,
      failed_tests: result.failedTests,
      visual_artifacts: result.visualArtifacts,
      a11y_score: normalizedScores.a11y,
      a11y_violations: result.a11yViolations || []
    });

    const totalScore =
      Number(normalizedScores.html || 0) +
      Number(normalizedScores.css || 0) +
      Number(normalizedScores.js || 0) +
      Number(normalizedScores.visual || 0) +
      Number(normalizedScores.a11y || 0) +
      Number(normalizedScores.quality || 0);

    await submission.update({
      status: 'completed',
      total_score: totalScore
    });

    if (job) await job.updateProgress({ stage: 'Evaluation complete' });
    console.log(`Job ${job.id} completed. Score: ${totalScore}`);

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await Submission.update({ status: 'failed' }, { where: { id: submissionId } });
    throw error;
  }
}, { 
  connection,
  concurrency: Number(process.env.WORKER_CONCURRENCY) || 2 // limits headless chromium instances
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} encountered an error: ${err.message}`);
});
