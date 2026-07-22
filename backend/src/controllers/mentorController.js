/**
 * Student AI Mentor Controller
 * Handles /api/mentor/* endpoints for performance analysis and daily plans.
 */

const { analyzePerformance, generateDailyPlan, recommendQuestions } = require('../services/mentorService');
const { Submission, Question, EvaluationRun } = require('../models');

/**
 * GET /api/mentor/performance/:studentId
 * Returns full performance analysis for a student.
 */
async function getSubmissionsSafely(studentId) {
  try {
    const submissions = await Submission.findAll({
      where: { student_id: String(studentId) },
      include: [
        { model: Question, attributes: ['id', 'title', 'description'] },
        { model: EvaluationRun, attributes: ['id', 'total_score', 'created_at'], separate: true, order: [['id', 'DESC']], limit: 1 }
      ],
      order: [['created_at', 'ASC']]
    });
    return Array.isArray(submissions) ? submissions : [];
  } catch (e) {
    return [];
  }
}

async function getQuestionsSafely() {
  try {
    const questions = await Question.findAll({ attributes: ['id', 'title', 'description'] });
    return Array.isArray(questions) ? questions : [];
  } catch (e) {
    return [];
  }
}

/**
 * GET /api/mentor/performance/:studentId
 * Returns full performance analysis for a student.
 */
async function getPerformance(req, res) {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const submissions = await getSubmissionsSafely(studentId);

    const normalized = submissions.map(s => {
      const runs = Array.isArray(s.EvaluationRuns) ? s.EvaluationRuns : [];
      const latestRun = runs[0];
      return {
        id: s.id,
        question_id: s.question_id,
        created_at: s.created_at,
        total_score: s.total_score ?? latestRun?.total_score ?? 0,
        Question: s.Question
      };
    });

    const performance = await analyzePerformance(studentId, normalized);
    performance._attemptedIds = normalized.map(s => s.question_id);

    res.json(performance);
  } catch (e) {
    console.error('[mentor] performance error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /api/mentor/daily-plan
 * Body: { studentId, examDates?: [{subject, date}] }
 * Returns today's study plan with tasks.
 */
async function getDailyPlan(req, res) {
  try {
    const { studentId, examDates = [] } = req.body || {};
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const submissions = await getSubmissionsSafely(studentId);

    const normalized = submissions.map(s => ({
      id: s.id,
      question_id: s.question_id,
      created_at: s.created_at,
      total_score: s.total_score ?? 0,
      Question: s.Question
    }));

    const performance = await analyzePerformance(studentId, normalized);
    const plan = generateDailyPlan(performance, examDates);

    res.json(plan);
  } catch (e) {
    console.error('[mentor] daily-plan error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /api/mentor/recommendations/:studentId
 * Returns question recommendations based on weak topics.
 */
async function getRecommendations(req, res) {
  try {
    const { studentId } = req.params;
    const count = Math.min(Number(req.query.count) || 5, 10);

    const [submissions, allQuestions] = await Promise.all([
      getSubmissionsSafely(studentId),
      getQuestionsSafely()
    ]);

    const normalized = submissions.map(s => ({
      question_id: s.question_id,
      total_score: s.total_score ?? 0,
      Question: s.Question
    }));

    const performance = await analyzePerformance(studentId, normalized);
    performance._attemptedIds = normalized.map(s => s.question_id);

    const recommended = recommendQuestions(performance, allQuestions, count);

    res.json({
      recommendations: recommended,
      basedOn: {
        weakTopics: performance.weakTopics,
        overallScore: performance.overallScore
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /api/mentor/chat
 * Simple AI chat endpoint using Gemini for student Q&A.
 * Body: { studentId, message, context? }
 */
async function mentorChat(req, res) {
  try {
    const { studentId, message, context = {} } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return a smart fallback response
      const fallback = generateFallbackResponse(message, context);
      return res.json({ reply: fallback, source: 'fallback' });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemContext = `You are an AI study mentor for a programming LMS called AmypoLMS. 
You help students learn HTML, CSS, and JavaScript.
Student performance context: Overall score ${context.overallScore || 'N/A'}/100, 
Weak topics: ${(context.weakTopics || []).join(', ') || 'None identified yet'},
Strong topics: ${(context.strongTopics || []).join(', ') || 'Still building'}.
Be encouraging, concise, and provide code examples when relevant.
Keep responses under 200 words.`;

    const result = await model.generateContent(`${systemContext}\n\nStudent: ${message}`);
    const reply = result.response.text();

    res.json({ reply, source: 'gemini' });
  } catch (e) {
    console.error('[mentor] chat error:', e.message);
    const fallback = generateFallbackResponse(req.body?.message || '', {});
    res.json({ reply: fallback, source: 'fallback' });
  }
}

function generateFallbackResponse(message, context) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('flexbox') || msg.includes('flex')) {
    return "**Flexbox Quick Guide:**\n`display: flex` on parent, then use `justify-content` (horizontal) and `align-items` (vertical) to control layout. Try `justify-content: space-between` for navigation bars!";
  }
  if (msg.includes('grid')) {
    return "**CSS Grid Quick Guide:**\nUse `grid-template-columns: repeat(3, 1fr)` for 3 equal columns. `gap` controls spacing. Use `grid-column: span 2` to make an element span multiple columns!";
  }
  if (msg.includes('array') || msg.includes('filter') || msg.includes('map')) {
    return "**Array Methods:**\n• `filter()` — keeps elements matching a condition\n• `map()` — transforms each element\n• `reduce()` — combines all elements into one value\n• Chain them: `arr.filter(x => x > 5).map(x => x * 2)`";
  }
  if (msg.includes('async') || msg.includes('promise') || msg.includes('fetch')) {
    return "**Async/Await Pattern:**\n```js\nasync function getData() {\n  try {\n    const res = await fetch(url);\n    const data = await res.json();\n    return data;\n  } catch(err) {\n    console.error(err);\n  }\n}\n```";
  }
  if (msg.includes('motivat') || msg.includes('stuck') || msg.includes('help')) {
    return "💪 Every expert was once a beginner! Break the problem into tiny pieces, solve one at a time. Try the browser console — `console.log()` is your best debugging friend. You've got this!";
  }
  return `Great question about "${message.substring(0, 40)}...". I recommend:\n1. Check the MDN Web Docs for reference\n2. Practice with a small isolated example first\n3. Use browser DevTools to inspect and debug\n4. Try the related challenges in your question bank!`;
}

module.exports = { getPerformance, getDailyPlan, getRecommendations, mentorChat };
