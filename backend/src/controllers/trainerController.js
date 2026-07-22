const { Submission, EvaluationRun, Question, TestSpec, QuestionFile } = require('../models');
const { enqueueBaseline } = require('../services/queueService');
const {
  prepareAutoBaselineSpec,
  resolveCurrentBaselineVersion
} = require('../services/baselineGenerationService');

const DEFAULT_STARTER_HTML = `<div class="card">
  <!-- Start styling here -->
</div>`;

const getQuestionAnalytics = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Fetch all completed submissions with their runs
    const submissions = await Submission.findAll({
      where: { question_id: questionId, status: 'completed' },
      include: [{ model: EvaluationRun }]
    });

    if (!submissions || submissions.length === 0) {
      return res.json({ 
        message: 'No data',
        avgScore: 0,
        scoreHistogram: [0, 0, 0, 0, 0], // 0-20, 20-40, 40-60, 60-80, 80-100
        failedTestsFrequency: {},
        visualDiffDist: { '0-1%': 0, '1-3%': 0, '3-6%': 0, '>6%': 0 },
        avgExecutionTimeMs: 0
      });
    }

    let totalScoreSum = 0;
    const scoreHistogram = [0, 0, 0, 0, 0];
    const failedTestsFrequency = {};
    const visualDiffDist = { '0-1%': 0, '1-3%': 0, '3-6%': 0, '>6%': 0 };
    let executionTotalMs = 0;
    let evalCountWithTime = 0;

    submissions.forEach(sub => {
      const score = sub.total_score || 0;
      totalScoreSum += score;
      
      // Histogram
      if (score <= 20) scoreHistogram[0]++;
      else if (score <= 40) scoreHistogram[1]++;
      else if (score <= 60) scoreHistogram[2]++;
      else if (score <= 80) scoreHistogram[3]++;
      else scoreHistogram[4]++;
      const runs = Array.isArray(sub.EvaluationRuns) ? sub.EvaluationRuns : [];
      const run = runs.length > 0
        ? runs.slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]
        : null;

      if (run) {
        // Compute failed test frequencies
        if (run.failed_tests && Array.isArray(run.failed_tests)) {
          run.failed_tests.forEach(test => {
            const key = test.testId || test.selector || 'unknown';
            failedTestsFrequency[key] = (failedTestsFrequency[key] || 0) + 1;
          });
        }

        // Visual diff distribution
        if (run.visual_artifacts && Array.isArray(run.visual_artifacts)) {
          run.visual_artifacts.forEach(artifact => {
            const p = artifact.diffPercent ?? artifact.diffPercentage ?? 0;
            if (p <= 1) visualDiffDist['0-1%']++;
            else if (p <= 3) visualDiffDist['1-3%']++;
            else if (p <= 6) visualDiffDist['3-6%']++;
            else visualDiffDist['>6%']++;
          });
        }

        // Execution average
        if (run.execution_timings && run.execution_timings.puppeteer_eval) {
          const msStr = String(run.execution_timings.puppeteer_eval).replace('ms', '');
          const ms = parseInt(msStr, 10);
          if (!isNaN(ms)) {
            executionTotalMs += ms;
            evalCountWithTime++;
          }
        }
      }
    });

    const avgScore = totalScoreSum / submissions.length;
    const avgExecutionTimeMs = evalCountWithTime > 0 ? executionTotalMs / evalCountWithTime : 0;

    return res.json({
      avgScore: avgScore.toFixed(2),
      scoreHistogram,
      failedTestsFrequency,
      visualDiffDist,
      avgExecutionTimeMs: Math.round(avgExecutionTimeMs)
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getQuestionAnalytics,
  createQuestion: async (req, res) => {
    try {
      const { title, description } = req.body || {};
      const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : null;
      if (!safeTitle) return res.status(400).json({ error: 'title is required' });

      const question = await Question.create({
        title: safeTitle,
        description: typeof description === 'string' ? description : '',
        allowed_libraries: []
      });

      // Create minimal spec so the question is editable immediately.
      await TestSpec.create({
        question_id: question.id,
        spec_json: {
          version: '1.0',
          viewports: [
            { name: 'desktop', width: 1366, height: 768 },
            { name: 'mobile', width: 390, height: 844 }
          ],
          rubric: { html: 20, css: 35, js: 35, visual: 10 },
          tests: { dom: [], css: [], interactions: [] }
        }
      });

      // Provide starter files so Practice Workspace can load the question immediately.
      await QuestionFile.create({ question_id: question.id, type: 'html', filename: 'index.html', content: DEFAULT_STARTER_HTML });
      await QuestionFile.create({ question_id: question.id, type: 'css', filename: 'styles.css', content: '' });
      await QuestionFile.create({ question_id: question.id, type: 'js', filename: 'script.js', content: '' });

      res.json({
        question,
        baseline: {
          queued: false,
          version: null,
          job_id: null,
          auto_filled: false
        }
      });
    } catch (error) {
      console.error('createQuestion failed:', error);
      // Sequelize often collapses this to "Validation error"; return more context for debugging.
      const details = Array.isArray(error?.errors) ? error.errors.map(e => e.message) : undefined;
      res.status(500).json({ error: error.message, details });
    }
  },
  getQuestionDraft: async (req, res) => {
    try {
      const { questionId } = req.params;

      const question = await Question.findByPk(questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      const spec = await TestSpec.findOne({ where: { question_id: questionId } });
      const files = await QuestionFile.findAll({ where: { question_id: questionId } });

      res.json({
        question,
        testSpec: spec ? spec.spec_json : null,
        files
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  saveQuestionDraft: async (req, res) => {
    try {
      const { questionId } = req.params;
      const {
        title,
        description,
        allowed_libraries,
        starter_html,
        starter_css,
        starter_js,
        spec_json
      } = req.body || {};

      const question = await Question.findByPk(questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      await question.update({
        title: typeof title === 'string' && title.trim() ? title.trim() : question.title,
        description: typeof description === 'string' ? description : question.description,
        allowed_libraries: Array.isArray(allowed_libraries) ? allowed_libraries : question.allowed_libraries
      });

      const upsertFile = async (type, filename, content) => {
        if (typeof content !== 'string') return;
        const existing = await QuestionFile.findOne({ where: { question_id: questionId, type } });
        if (existing) {
          await existing.update({ filename, content });
        } else {
          await QuestionFile.create({ question_id: questionId, type, filename, content });
        }
      };

      await upsertFile('html', 'index.html', starter_html);
      await upsertFile('css', 'styles.css', starter_css);
      await upsertFile('js', 'script.js', starter_js);

      let baseline = {
        queued: false,
        version: null,
        jobId: null,
        autoFilled: false
      };

      if (spec_json && typeof spec_json === 'object') {
        const preparedBaseline = prepareAutoBaselineSpec(spec_json, {
          html: starter_html,
          css: starter_css,
          js: starter_js
        });
        const existingSpec = await TestSpec.findOne({ where: { question_id: questionId } });
        if (existingSpec) {
          await existingSpec.update({ spec_json: preparedBaseline.spec });
        } else {
          await TestSpec.create({ question_id: questionId, spec_json: preparedBaseline.spec });
        }

        const currentVersion = await resolveCurrentBaselineVersion(questionId);
        if (preparedBaseline.ready && currentVersion === 0) {
          const nextVersion = currentVersion + 1;
          const job = await enqueueBaseline(questionId, nextVersion);
          baseline = {
            queued: true,
            version: nextVersion,
            jobId: job?.id || null,
            autoFilled: preparedBaseline.autoFilled
          };
        } else {
          baseline = {
            queued: false,
            version: currentVersion || null,
            jobId: null,
            autoFilled: preparedBaseline.autoFilled
          };
        }
      }

      res.json({
        success: true,
        baseline: {
          queued: baseline.queued,
          version: baseline.version,
          job_id: baseline.jobId,
          auto_filled: baseline.autoFilled
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
