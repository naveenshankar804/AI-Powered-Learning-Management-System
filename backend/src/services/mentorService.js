/**
 * Student AI Mentor Service
 * Analyzes student performance from submission history
 * and generates personalized daily study plans.
 */

const TOPIC_MAP = {
  'CSS Flexbox': ['flex', 'flexbox', 'justify-content', 'align-items'],
  'CSS Grid': ['grid', 'grid-template', 'grid-column'],
  'DOM Manipulation': ['dom', 'queryselector', 'addeventlistener', 'createelement'],
  'JavaScript Arrays': ['array', 'filter', 'map', 'reduce', 'sort'],
  'JavaScript Events': ['event', 'click', 'keydown', 'input', 'listener'],
  'HTML Forms': ['form', 'input', 'validation', 'submit'],
  'CSS Animations': ['animation', 'keyframe', 'transition', 'transform'],
  'Responsive Design': ['media', 'viewport', 'responsive', 'mobile'],
  'JavaScript Objects': ['object', 'prototype', 'class', 'property'],
  'Fetch & Promises': ['fetch', 'promise', 'async', 'await', 'api'],
  'LocalStorage': ['localstorage', 'storage', 'persist', 'sessionstorage'],
  'CSS Variables': ['var(', 'custom property', ':root']
};

/**
 * Maps a question's title/description to the closest topic.
 */
function inferTopic(question) {
  if (!question) return 'General';
  const text = `${question.title || ''} ${question.description || ''}`.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return topic;
  }
  return 'General';
}

/**
 * Aggregates submission scores per topic.
 * @param {Array} submissions — with .Question and .total_score
 * @returns {Object} { topicName: { count, totalScore, avgScore, scores[] } }
 */
function aggregateByTopic(submissions) {
  const map = {};

  for (const sub of submissions) {
    const topic = inferTopic(sub.Question || { title: sub.question_id });
    const score = Number(sub.total_score) || 0;

    if (!map[topic]) {
      map[topic] = { count: 0, totalScore: 0, avgScore: 0, scores: [], lastAttempt: null };
    }
    map[topic].count += 1;
    map[topic].totalScore += score;
    map[topic].scores.push(score);
    if (!map[topic].lastAttempt || new Date(sub.created_at) > new Date(map[topic].lastAttempt)) {
      map[topic].lastAttempt = sub.created_at;
    }
  }

  for (const topic of Object.keys(map)) {
    const t = map[topic];
    t.avgScore = Math.round(t.totalScore / t.count);
    t.trend = computeTrend(t.scores);
    t.level = scoreToLevel(t.avgScore);
  }

  return map;
}

function computeTrend(scores) {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(-3);
  const older = scores.slice(0, -3);
  if (!older.length) return 'stable';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (recentAvg > olderAvg + 5) return 'improving';
  if (recentAvg < olderAvg - 5) return 'declining';
  return 'stable';
}

function scoreToLevel(avg) {
  if (avg >= 85) return 'excellent';
  if (avg >= 70) return 'good';
  if (avg >= 50) return 'fair';
  return 'needs_work';
}

/**
 * Builds a performance analysis object.
 */
async function analyzePerformance(studentId, submissions) {
  const topicData = aggregateByTopic(submissions);
  const allScores = submissions.map(s => Number(s.total_score) || 0);
  const overallAvg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  // Compute streak
  const sorted = [...submissions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const sub of sorted) {
    const d = new Date(sub.created_at);
    d.setHours(0, 0, 0, 0);
    const diff = (checkDate - d) / (1000 * 60 * 60 * 24);
    if (diff === 0 || diff === streak) {
      if (streak === 0 && diff === 0) streak = 1;
      else if (diff === streak) { streak++; checkDate = d; }
    } else break;
  }

  // Rank topics by performance
  const topicList = Object.entries(topicData).map(([name, data]) => ({
    name,
    ...data,
    score: data.avgScore
  })).sort((a, b) => a.score - b.score);

  // Default foundational topics if student has no submissions yet
  const defaultTopics = ['CSS Flexbox', 'DOM Manipulation', 'JavaScript Arrays', 'HTML Forms', 'CSS Animations'];
  
  if (topicList.length === 0) {
    for (const top of defaultTopics) {
      topicData[top] = { count: 0, totalScore: 0, avgScore: 0, scores: [], lastAttempt: null, trend: 'stable', level: 'fair' };
    }
  }

  const weakTopics = topicList.length > 0 
    ? topicList.slice(0, 3).map(t => t.name) 
    : ['CSS Flexbox', 'DOM Manipulation', 'JavaScript Arrays'];
    
  const strongTopics = topicList.length > 0 
    ? topicList.slice(-3).map(t => t.name).reverse() 
    : ['HTML Forms', 'CSS Variables'];

  // Recent activity
  const last7Days = submissions.filter(s => {
    const daysDiff = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  return {
    studentId,
    overallScore: overallAvg,
    totalSubmissions: submissions.length,
    streak,
    last7DaysActivity: last7Days,
    topics: topicData,
    weakTopics,
    strongTopics,
    level: scoreToLevel(overallAvg),
    scoreTrend: computeTrend(allScores),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generates a daily study plan based on exam dates and weak topics.
 */
function generateDailyPlan(performance, examDates = []) {
  const today = new Date();
  const tasks = [];

  // Priority: weak topics first, fallback to foundational defaults
  const weak = (performance.weakTopics && performance.weakTopics.length > 0) 
    ? performance.weakTopics 
    : ['CSS Flexbox', 'DOM Manipulation', 'JavaScript Arrays'];
    
  const strong = (performance.strongTopics && performance.strongTopics.length > 0) 
    ? performance.strongTopics 
    : ['HTML Forms', 'CSS Animations'];

  // 1. Morning: practice primary weak topic
  tasks.push({
    id: 't1',
    time: '09:00',
    duration: 45,
    type: 'practice',
    priority: 'high',
    title: `Practice: ${weak[0]}`,
    description: `Attempt 2 foundational exercises in ${weak[0]} to strengthen core skills`,
    topic: weak[0],
    completed: false
  });

  // 2. Mid-morning: study session
  tasks.push({
    id: 't2',
    time: '10:30',
    duration: 30,
    type: 'study',
    priority: 'medium',
    title: `Study Session: ${weak[1] || 'JavaScript Methods'}`,
    description: `Review documentation and code patterns for ${weak[1] || 'JavaScript Methods'}`,
    topic: weak[1] || 'General',
    completed: false
  });

  // 3. Afternoon: daily coding challenge
  tasks.push({
    id: 't3',
    time: '14:00',
    duration: 60,
    type: 'challenge',
    priority: 'high',
    title: `Daily Coding Challenge (${weak[2] || 'DOM Events'})`,
    description: `Solve one interactive challenge and submit your code to the assessment engine`,
    topic: weak[2] || 'DOM Events',
    completed: false
  });

  // 4. Late afternoon: apply strength
  tasks.push({
    id: 't4',
    time: '16:30',
    duration: 30,
    type: 'review',
    priority: 'low',
    title: `Apply: ${strong[0]}`,
    description: `Build a small UI feature using your ${strong[0]} skills`,
    topic: strong[0],
    completed: false
  });

  // 5. Evening: revision
  tasks.push({
    id: 't5',
    time: '20:00',
    duration: 20,
    type: 'revision',
    priority: 'medium',
    title: 'Daily Code Revision',
    description: 'Review solutions, flashcards, and clean up workspace code',
    topic: 'General',
    completed: false
  });

  // Exam countdowns
  const exams = (examDates || []).map(e => {
    const daysLeft = Math.ceil((new Date(e.date) - today) / (1000 * 60 * 60 * 24));
    return { ...e, daysLeft, urgent: daysLeft <= 7 };
  }).filter(e => e.daysLeft > 0);

  // If exam is soon, add exam prep task
  const urgentExam = exams.find(e => e.urgent);
  if (urgentExam) {
    tasks.unshift({
      id: 't0',
      time: '08:00',
      duration: 30,
      type: 'exam_prep',
      priority: 'critical',
      title: `⚠️ Exam Prep: ${urgentExam.subject}`,
      description: `${urgentExam.daysLeft} days until exam. Focus on key topics.`,
      topic: urgentExam.subject,
      completed: false
    });
  }

  return {
    date: today.toISOString().split('T')[0],
    totalMinutes: tasks.reduce((s, t) => s + t.duration, 0),
    tasks,
    exams,
    motivation: getMotivationMessage(performance)
  };
}

function getMotivationMessage(perf) {
  if (perf.streak >= 7) return `🔥 ${perf.streak}-day streak! You're on fire!`;
  if (perf.overallScore >= 80) return '⭐ Great performance! Keep pushing harder!';
  if (perf.scoreTrend === 'improving') return '📈 Your scores are improving! Great momentum!';
  if (perf.weakTopics?.length) return `💪 Focus on ${perf.weakTopics[0]} today — you can do it!`;
  return '🚀 Every line of code makes you better. Keep going!';
}

const { QUESTION_BANK } = require('./aiQuestionService');

function recommendQuestions(performance, allQuestions, count = 5) {
  const weak = (performance.weakTopics && performance.weakTopics.length > 0)
    ? performance.weakTopics
    : ['CSS Flexbox', 'DOM Manipulation', 'JavaScript Arrays'];
    
  const attempted = new Set(
    (performance._attemptedIds || []).map(id => Number(id))
  );

  let pool = Array.isArray(allQuestions) && allQuestions.length > 0 ? allQuestions : QUESTION_BANK;

  // Score each question by relevance to weak topics
  const scored = pool
    .filter(q => !q.id || !attempted.has(Number(q.id)))
    .map(q => {
      const topic = q.topic || inferTopic(q);
      const isWeak = weak.indexOf(topic);
      const relevance = isWeak >= 0 ? (3 - isWeak) * 10 : 5;
      return {
        id: q.id || Math.floor(Math.random() * 1000) + 10,
        title: q.title,
        description: q.description,
        relevance,
        recommendedTopic: topic
      };
    })
    .sort((a, b) => b.relevance - a.relevance);

  return scored.slice(0, count);
}

module.exports = { analyzePerformance, generateDailyPlan, recommendQuestions, inferTopic };
