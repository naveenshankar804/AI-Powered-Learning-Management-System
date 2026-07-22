const { Question, TestSpec, QuestionFile, Baseline } = require('../models');
const fs = require('fs');
const path = require('path');
const { enqueueBaseline } = require('../services/queueService');
const {
  prepareAutoBaselineSpec,
  resolveCurrentBaselineVersion,
  resolveNextBaselineVersion
} = require('../services/baselineGenerationService');

const DEFAULT_STARTER_FILES = {
  html: `<div class="card">\n  <!-- Start styling here -->\n</div>`,
  css: '',
  js: ''
};

async function upsertQuestionFiles(questionId, filesOrStarter) {
  const src = filesOrStarter && typeof filesOrStarter === 'object' ? filesOrStarter : {};
  const html = typeof src.html === 'string' ? src.html : undefined;
  const css = typeof src.css === 'string' ? src.css : undefined;
  const js = typeof src.js === 'string' ? src.js : undefined;

  const upsert = async (type, filename, content) => {
    if (typeof content !== 'string') return;
    const existing = await QuestionFile.findOne({ where: { question_id: questionId, type } });
    if (existing) await existing.update({ filename, content });
    else await QuestionFile.create({ question_id: questionId, type, filename, content });
  };

  await upsert('html', 'index.html', html);
  await upsert('css', 'styles.css', css);
  await upsert('js', 'script.js', js);
}

async function listQuestions(req, res) {
  try {
    const questions = await Question.findAll({
      order: [['id', 'ASC']],
      attributes: ['id', 'title', 'description', 'allowed_libraries', 'created_at', 'updated_at']
    });
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getQuestionDetails(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const spec = await TestSpec.findOne({ where: { question_id: id } });
    const files = await QuestionFile.findAll({ where: { question_id: id } });

    res.json({
      question,
      testSpec: spec ? spec.spec_json : null,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// FR-1: Create question with starter files + test spec + library policy.
async function createQuestion(req, res) {
  try {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'title is required' });

    const description = typeof body.description === 'string' ? body.description : '';
    const allowed_libraries = Array.isArray(body.allowed_libraries) ? body.allowed_libraries : [];
    const starter_code = body.starter_code && typeof body.starter_code === 'object' ? body.starter_code : null;
    const files = body.files && typeof body.files === 'object' ? body.files : null;
    const spec_json = body.spec_json && typeof body.spec_json === 'object' ? body.spec_json : null;

    const q = await Question.create({
      title,
      description,
      allowed_libraries,
      starter_code: starter_code || null
    });

    // Ensure starter files exist for Practice Workspace (QuestionFile is the source of truth there).
    await upsertQuestionFiles(q.id, files || starter_code || DEFAULT_STARTER_FILES);

    const fallbackFiles = files || starter_code || DEFAULT_STARTER_FILES;
    const initialSpec = spec_json || {
      version: '1.0',
      viewports: [
        { name: 'desktop', width: 1366, height: 768 },
        { name: 'mobile', width: 390, height: 844 }
      ],
      rubric: { html: 20, css: 35, js: 35, visual: 10, quality: 0, a11y: 0 },
      tests: { dom: [], css: [], interactions: [] }
    };

    const preparedBaseline = prepareAutoBaselineSpec(initialSpec, fallbackFiles);

    // Ensure a TestSpec exists.
    await TestSpec.create({
      question_id: q.id,
      spec_json: preparedBaseline.spec
    });

    let baseline = {
      queued: false,
      version: null,
      jobId: null,
      autoFilled: preparedBaseline.autoFilled
    };

    const currentVersion = await resolveCurrentBaselineVersion(q.id);
    if (preparedBaseline.ready && currentVersion === 0) {
      const nextVersion = currentVersion + 1;
      const job = await enqueueBaseline(q.id, nextVersion);
      baseline = {
        queued: true,
        version: nextVersion,
        jobId: job?.id || null,
        autoFilled: preparedBaseline.autoFilled
      };
    }

    return res.status(201).json({
      question: q,
      baseline: {
        queued: baseline.queued,
        version: baseline.version,
        job_id: baseline.jobId,
        auto_filled: baseline.autoFilled
      }
    });
  } catch (error) {
    const details = Array.isArray(error?.errors) ? error.errors.map(e => e.message) : undefined;
    return res.status(500).json({ error: error.message, details });
  }
}

// FR-1: Update question + upsert starter files/spec.
async function updateQuestion(req, res) {
  try {
    const questionId = Number(req.params.id);
    if (!questionId) return res.status(400).json({ error: 'Invalid question id' });
    const q = await Question.findByPk(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const body = req.body || {};
    const next = {};
    if (typeof body.title === 'string' && body.title.trim()) next.title = body.title.trim();
    if (typeof body.description === 'string') next.description = body.description;
    if (Array.isArray(body.allowed_libraries)) next.allowed_libraries = body.allowed_libraries;
    if (body.starter_code && typeof body.starter_code === 'object') next.starter_code = body.starter_code;
    await q.update(next);

    const files = body.files && typeof body.files === 'object' ? body.files : null;
    const starter_code = body.starter_code && typeof body.starter_code === 'object' ? body.starter_code : null;
    if (files || starter_code) await upsertQuestionFiles(questionId, files || starter_code);

    let baseline = {
      queued: false,
      version: null,
      jobId: null,
      autoFilled: false
    };

    if (body.spec_json && typeof body.spec_json === 'object') {
      const fallbackFiles = files || starter_code || {};
      const preparedBaseline = prepareAutoBaselineSpec(body.spec_json, fallbackFiles);
      const existing = await TestSpec.findOne({ where: { question_id: questionId } });
      if (existing) await existing.update({ spec_json: preparedBaseline.spec });
      else await TestSpec.create({ question_id: questionId, spec_json: preparedBaseline.spec });

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

    return res.json({
      success: true,
      baseline: {
        queued: baseline.queued,
        version: baseline.version,
        job_id: baseline.jobId,
        auto_filled: baseline.autoFilled
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteQuestion(req, res) {
  try {
    const questionId = Number(req.params.id);
    if (!questionId) return res.status(400).json({ error: 'Invalid question id' });

    const q = await Question.findByPk(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    // Explicit cleanup to be safe even if FK cascades aren't present.
    await QuestionFile.destroy({ where: { question_id: questionId } });
    await TestSpec.destroy({ where: { question_id: questionId } });
    await Baseline.destroy({ where: { question_id: questionId } });
    await q.destroy();

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function generateBaseline(req, res) {
  try {
    const { id } = req.params;
    const questionId = Number(id);
    if (!questionId) return res.status(400).json({ error: 'Invalid question id' });

    const question = await Question.findByPk(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const specRow = await TestSpec.findOne({ where: { question_id: questionId } });
    const spec = specRow ? specRow.spec_json : null;
    if (!spec || typeof spec !== 'object') return res.status(400).json({ error: 'TestSpec not configured' });

    const baseline = spec.baseline;
    if (!baseline || (!baseline.html && !baseline.css && !baseline.js)) {
      return res.status(400).json({ error: 'Reference solution (testSpec.baseline) is required to generate baseline' });
    }

    const nextVersion = await resolveNextBaselineVersion(questionId);

    const job = await enqueueBaseline(questionId, nextVersion);

    return res.json({
      status: 'queued',
      question_id: questionId,
      version: nextVersion,
      job_id: job?.id || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listQuestions, getQuestionDetails, createQuestion, updateQuestion, deleteQuestion, generateBaseline };
