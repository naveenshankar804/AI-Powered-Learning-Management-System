/**
 * AI Question Controller
 * Handles all /api/ai/* endpoints for AI-powered question generation.
 */

const { generateQuestions, getBankQuestions, TOPICS, QUESTION_BANK } = require('../services/aiQuestionService');
const { Question, TestSpec, QuestionFile } = require('../models');
const { prepareAutoBaselineSpec } = require('../services/baselineGenerationService');

/**
 * GET /api/ai/topics
 * Returns the list of available programming topics.
 */
async function getTopics(req, res) {
  try {
    const topics = TOPICS.map(t => ({
      name: t,
      questionCount: QUESTION_BANK.filter(q => q.topic === t).length,
      difficulties: ['easy', 'medium', 'hard']
    }));
    res.json({ topics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /api/ai/generate-questions
 * Body: { topic, difficulty, count }
 * Returns generated questions (not yet saved to DB).
 */
async function generateQuestionsHandler(req, res) {
  try {
    const { topic = 'Any', difficulty = 'medium', count = 1 } = req.body || {};
    const n = Math.min(Math.max(Number(count) || 1, 1), 10); // clamp 1–10

    const questions = await generateQuestions(topic, difficulty, n);
    res.json({ questions, count: questions.length, source: questions[0]?.source || 'bank' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /api/ai/generate-and-save
 * Generates a question via AI and saves it directly to the database.
 * Body: { topic, difficulty, overrides?: { title, description } }
 */
async function generateAndSave(req, res) {
  try {
    const { topic = 'Any', difficulty = 'medium', overrides = {} } = req.body || {};
    const [generated] = await generateQuestions(topic, difficulty, 1);

    if (!generated) {
      return res.status(500).json({ error: 'Failed to generate question' });
    }

    // Apply any manual overrides from the teacher
    const finalTitle = (overrides.title || generated.title || '').trim();
    const finalDesc = overrides.description || generated.description || '';
    const finalFiles = generated.starter_code || { html: '', css: '', js: '' };

    if (!finalTitle) return res.status(400).json({ error: 'Generated question has no title' });

    const q = await Question.create({
      title: finalTitle,
      description: finalDesc,
      allowed_libraries: [],
      starter_code: finalFiles
    });

    // Create starter files
    const fileTypes = [
      { type: 'html', filename: 'index.html', content: finalFiles.html || '' },
      { type: 'css', filename: 'styles.css', content: finalFiles.css || '' },
      { type: 'js', filename: 'script.js', content: finalFiles.js || '' }
    ];
    await Promise.all(fileTypes.map(f => QuestionFile.create({ question_id: q.id, ...f })));

    // Create a basic test spec
    const basicSpec = {
      version: '1.0',
      viewports: [
        { name: 'desktop', width: 1366, height: 768 },
        { name: 'mobile', width: 390, height: 844 }
      ],
      rubric: { html: 20, css: 35, js: 35, visual: 10, quality: 0, a11y: 0 },
      tests: { dom: [], css: [], interactions: [] }
    };
    const prepared = prepareAutoBaselineSpec(basicSpec, finalFiles);
    await TestSpec.create({ question_id: q.id, spec_json: prepared.spec });

    res.status(201).json({
      success: true,
      question: q,
      source: generated.source,
      hints: generated.hints || []
    });
  } catch (e) {
    console.error('[AI] generate-and-save error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /api/ai/question-bank
 * Returns the full curated question bank (for browsing).
 * Query: ?topic=CSS+Flexbox&difficulty=easy
 */
async function getQuestionBank(req, res) {
  try {
    const { topic, difficulty } = req.query;
    const results = getBankQuestions(topic || 'Any', difficulty || 'any', 50);
    res.json({ questions: results, total: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /api/ai/status
 * Returns whether Gemini API is configured.
 */
async function getAIStatus(req, res) {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  res.json({
    geminiEnabled: hasKey,
    fallbackAvailable: true,
    totalBankQuestions: QUESTION_BANK.length,
    topics: TOPICS.length,
    message: hasKey
      ? 'Gemini AI is active — questions will be generated dynamically'
      : 'Using curated question bank (set GEMINI_API_KEY to enable AI generation)'
  });
}

module.exports = { getTopics, generateQuestionsHandler, generateAndSave, getQuestionBank, getAIStatus };
