import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Flame, Target, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Circle, Clock, MessageCircle, Send, X,
  Calendar, BookOpen, Star, AlertCircle, Sparkles, ChevronRight,
  BarChart3, Zap, GraduationCap, ArrowRight, RefreshCw
} from 'lucide-react';
import { readUserProfile } from '../utils/userProfile';

const SCORE_COLORS = {
  excellent: { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', border: '#10b981' },
  good: { bg: 'rgba(59,130,246,0.12)', text: '#93c5fd', border: '#3b82f6' },
  fair: { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: '#f59e0b' },
  needs_work: { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: '#ef4444' },
};

const TASK_TYPE_COLORS = {
  practice: '#6c63ff',
  study: '#3b82f6',
  challenge: '#f59e0b',
  review: '#10b981',
  revision: '#8b5cf6',
  exam_prep: '#ef4444',
};

const TASK_TYPE_ICONS = {
  practice: '🏋️',
  study: '📖',
  challenge: '⚡',
  review: '🔄',
  revision: '📝',
  exam_prep: '⚠️',
};

export default function AIMentorPage() {
  const profile = readUserProfile();
  const studentId = profile?.id || '1';
  const studentName = profile?.name || 'Student';

  const [performance, setPerformance] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mentor_tasks') || '{}'); } catch { return {}; }
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'mentor', text: `👋 Hi ${studentName}! I'm your AI Study Mentor. Ask me anything about HTML, CSS, or JavaScript — or ask for help with a concept you're struggling with!` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [examDates, setExamDates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('exam_dates') || '[]'); } catch { return []; }
  });
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ subject: '', date: '' });
  const [activeSection, setActiveSection] = useState('overview');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, planRes, recRes] = await Promise.allSettled([
        fetch(`/api/mentor/performance/${studentId}`).then(r => r.json()),
        fetch('/api/mentor/daily-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, examDates })
        }).then(r => r.json()),
        fetch(`/api/mentor/recommendations/${studentId}?count=5`).then(r => r.json())
      ]);

      const perfData = (perfRes.status === 'fulfilled' && !perfRes.value.error) ? perfRes.value : null;
      const planData = (planRes.status === 'fulfilled' && !planRes.value.error) ? planRes.value : null;
      const recData = (recRes.status === 'fulfilled' && Array.isArray(recRes.value?.recommendations)) ? recRes.value.recommendations : [];

      if (perfData && (perfData.totalSubmissions > 0 || Object.keys(perfData.topics || {}).length > 0)) {
        setPerformance(perfData);
      } else {
        setPerformance(getMockPerformance(studentName));
      }

      if (planData && Array.isArray(planData.tasks) && planData.tasks.length > 0) {
        setDailyPlan(planData);
      } else {
        setDailyPlan(getMockDailyPlan());
      }

      if (recData.length > 0) {
        setRecommendations(recData);
      } else {
        setRecommendations(getMockRecommendations());
      }
    } catch (e) {
      setPerformance(getMockPerformance(studentName));
      setDailyPlan(getMockDailyPlan());
      setRecommendations(getMockRecommendations());
    } finally {
      setLoading(false);
    }
  }, [studentId, studentName, examDates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleTask = (taskId) => {
    const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] };
    setCompletedTasks(updated);
    localStorage.setItem('mentor_tasks', JSON.stringify(updated));
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'student', text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          message: msg,
          context: {
            overallScore: performance?.overallScore,
            weakTopics: performance?.weakTopics,
            strongTopics: performance?.strongTopics
          }
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'mentor', text: data.reply || 'Let me think about that...' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'mentor', text: 'Connection issue. Please try again in a moment!' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const addExam = () => {
    if (!newExam.subject || !newExam.date) return;
    const updated = [...examDates, newExam];
    setExamDates(updated);
    localStorage.setItem('exam_dates', JSON.stringify(updated));
    setNewExam({ subject: '', date: '' });
    setShowAddExam(false);
  };

  const removeExam = (idx) => {
    const updated = examDates.filter((_, i) => i !== idx);
    setExamDates(updated);
    localStorage.setItem('exam_dates', JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid rgba(108,99,255,0.2)', borderTop: '3px solid #6c63ff' }}
        />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Analyzing your performance...</p>
      </div>
    );
  }

  const perf = performance || {};
  const plan = dailyPlan || {};
  const tasksDone = (plan.tasks || []).filter(t => completedTasks[t.id]).length;
  const totalTasks = (plan.tasks || []).length;
  const completionPct = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0a1a1a 100%)', color: '#cdd6f4', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6c63ff, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(108,99,255,0.35)' }}>
                <Brain size={28} color="white" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  AI Study Mentor
                </h1>
                <p style={{ margin: 0, color: '#7c7c9a', fontSize: 14 }}>Personalized learning for {studentName}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button onClick={() => setChatOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <MessageCircle size={14} /> Ask AI Mentor
              </button>
            </div>
          </div>
        </motion.div>

        {/* Motivation Banner */}
        {perf.motivationMessage || plan.motivation ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: '1.5rem', fontSize: 15, color: '#c4b5fd' }}>
            {plan.motivation || perf.motivationMessage}
          </motion.div>
        ) : null}

        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={<BarChart3 size={22} color="#6c63ff" />} label="Overall Score" value={`${perf.overallScore || 0}%`} sub={perf.level?.replace('_', ' ')} color="#6c63ff" />
          <StatCard icon={<Flame size={22} color="#f59e0b" />} label="Daily Streak" value={`${perf.streak || 0} days`} sub="Keep it up!" color="#f59e0b" />
          <StatCard icon={<Target size={22} color="#10b981" />} label="Submissions" value={perf.totalSubmissions || 0} sub={`${perf.last7DaysActivity || 0} this week`} color="#10b981" />
          <StatCard icon={<CheckCircle2 size={22} color="#a855f7" />} label="Today's Progress" value={`${completionPct}%`} sub={`${tasksDone}/${totalTasks} tasks done`} color="#a855f7" progress={completionPct} />
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Daily Study Plan */}
            <Section title="📅 Today's Study Plan" icon={<Calendar size={18} />} date={plan.date}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6c63ff, #10b981)' }}
                  />
                </div>
                <span style={{ fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>{completionPct}% complete</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(plan.tasks || []).map((task, idx) => {
                  const done = completedTasks[task.id];
                  const col = TASK_TYPE_COLORS[task.type] || '#6c63ff';
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => toggleTask(task.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        transition: 'all 0.2s', opacity: done ? 0.7 : 1
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: 2 }}>
                        {done ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} color="#4b5563" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: done ? 400 : 600, color: done ? '#6b7280' : '#e2e8f0', textDecoration: done ? 'line-through' : 'none' }}>
                            {TASK_TYPE_ICONS[task.type]} {task.title}
                          </span>
                          {task.priority === 'critical' && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>Critical</span>}
                          {task.priority === 'high' && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, background: `${col}18`, color: col }}>High</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{task.description}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {task.time} · {task.duration}min
                          </span>
                          <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, background: `${col}18`, color: col }}>
                            {task.topic}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalTasks > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#4b5563', textAlign: 'center' }}>
                  Total study time: <strong style={{ color: '#9ca3af' }}>{plan.totalMinutes || 0} minutes</strong>
                </div>
              )}
            </Section>

            {/* Topic Performance Heatmap */}
            <Section title="🧠 Topic Performance" icon={<BarChart3 size={18} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(perf.topics || {}).slice(0, 8).map(([topic, data]) => {
                  const levelColor = SCORE_COLORS[data.level || 'fair'];
                  const trendIcon = data.trend === 'improving' ? <TrendingUp size={13} color="#10b981" /> : data.trend === 'declining' ? <TrendingDown size={13} color="#ef4444" /> : <Minus size={13} color="#6b7280" />;
                  return (
                    <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 120, fontSize: 12, color: '#9ca3af', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topic}
                      </div>
                      <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.avgScore || 0}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          style={{ height: '100%', borderRadius: 99, background: levelColor.border }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 80, flexShrink: 0, justifyContent: 'flex-end' }}>
                        {trendIcon}
                        <span style={{ fontSize: 12, color: levelColor.text, fontWeight: 600 }}>{data.avgScore || 0}%</span>
                        <span style={{ fontSize: 11, color: '#4b5563' }}>({data.count || 0})</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(perf.topics || {}).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4b5563', fontSize: 14 }}>
                    No submissions yet. Start practicing to see your performance!
                  </div>
                )}
              </div>

              {/* Weak / Strong summary */}
              {(perf.weakTopics?.length > 0 || perf.strongTopics?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 16 }}>
                  {perf.weakTopics?.length > 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Needs Work</div>
                      {perf.weakTopics.map(t => <div key={t} style={{ fontSize: 12, color: '#fca5a5', padding: '2px 0' }}>{t}</div>)}
                    </div>
                  )}
                  {perf.strongTopics?.length > 0 && (
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⭐ Strong Areas</div>
                      {perf.strongTopics.map(t => <div key={t} style={{ fontSize: 12, color: '#6ee7b7', padding: '2px 0' }}>{t}</div>)}
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Exam Countdown */}
            <Section title="📌 Exam Dates" icon={<GraduationCap size={16} />}>
              {examDates.map((exam, idx) => {
                const daysLeft = Math.ceil((new Date(exam.date) - Date.now()) / (1000 * 60 * 60 * 24));
                const urgent = daysLeft <= 7;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{exam.subject}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{exam.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#fca5a5' : '#a78bfa', padding: '2px 8px', borderRadius: 99, background: urgent ? 'rgba(239,68,68,0.15)' : 'rgba(108,99,255,0.12)' }}>
                        {daysLeft > 0 ? `${daysLeft}d` : 'Today!'}
                      </span>
                      <button onClick={() => removeExam(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#4b5563', padding: 4, display: 'flex' }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {examDates.length === 0 && (
                <div style={{ fontSize: 13, color: '#4b5563', textAlign: 'center', padding: '0.5rem 0' }}>No exams added yet</div>
              )}
              {showAddExam ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={newExam.subject} onChange={e => setNewExam(p => ({ ...p, subject: e.target.value }))} placeholder="Subject name" style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#cdd6f4', fontSize: 13, outline: 'none' }} />
                  <input type="date" value={newExam.date} onChange={e => setNewExam(p => ({ ...p, date: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#cdd6f4', fontSize: 13, outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addExam} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: '#6c63ff', color: 'white', cursor: 'pointer', fontSize: 13 }}>Save</button>
                    <button onClick={() => setShowAddExam(false)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddExam(true)} style={{ width: '100%', marginTop: 10, padding: '7px', borderRadius: 8, border: '1px dashed rgba(108,99,255,0.4)', background: 'transparent', color: '#a78bfa', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  + Add Exam Date
                </button>
              )}
            </Section>

            {/* Recommended Questions */}
            <Section title="🎯 Recommended Next" icon={<Sparkles size={16} />}>
              {recommendations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recommendations.slice(0, 5).map((q, idx) => (
                    <motion.a
                      key={idx}
                      href="/roadmap"
                      whileHover={{ x: 4 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookOpen size={13} color="#a78bfa" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{q.recommendedTopic}</div>
                      </div>
                      <ChevronRight size={14} color="#4b5563" />
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#4b5563', fontSize: 13 }}>
                  Complete some exercises to get personalized recommendations!
                  <br /><br />
                  <a href="/roadmap" style={{ color: '#a78bfa', textDecoration: 'none' }}>Browse All Questions →</a>
                </div>
              )}
            </Section>

            {/* Internship Guidance */}
            <Section title="🌟 Career Tips" icon={<Star size={16} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { tip: 'Update your GitHub daily — recruiters check this!', link: '#' },
                  { tip: 'Write a LinkedIn post about what you learned this week', link: '#' },
                  { tip: 'Apply to 2-3 internships per week consistently', link: '#' },
                  { tip: 'Build one portfolio project per month', link: '#' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <Zap size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{item.tip}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, zIndex: 1000,
              background: '#13131f', borderLeft: '1px solid rgba(108,99,255,0.2)',
              display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* Chat Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6c63ff, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={18} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Study Mentor</div>
                <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Online
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
              {chatMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', justifyContent: msg.role === 'student' ? 'flex-end' : 'flex-start',
                    marginBottom: 12
                  }}
                >
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'student' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                    background: msg.role === 'student' ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'student' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Explain Flexbox', 'How do I improve?', 'Best JS practices', 'Review my weak topics'].map(s => (
                <button
                  key={s}
                  onClick={() => { setChatInput(s); }}
                  style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)', color: '#a78bfa', cursor: 'pointer', fontSize: 11 }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask anything..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#cdd6f4', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: chatInput.trim() ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : 'rgba(255,255,255,0.05)', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.3); border-radius: 3px; }
        a { color: inherit; }
      `}</style>
    </div>
  );
}

function Section({ title, icon, date, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon} {title}
        </h3>
        {date && <span style={{ fontSize: 12, color: '#4b5563' }}>{date}</span>}
      </div>
      {children}
    </motion.div>
  );
}

function StatCard({ icon, label, value, sub, color, progress }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}22`, borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}10` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ padding: 8, borderRadius: 10, background: `${color}15` }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#4b5563' }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', borderRadius: 99, background: color }} />
        </div>
      )}
    </motion.div>
  );
}

// Mock data used when backend has no submissions yet
function getMockPerformance(name) {
  return {
    studentId: '1',
    overallScore: 72,
    totalSubmissions: 0,
    streak: 0,
    last7DaysActivity: 0,
    level: 'good',
    scoreTrend: 'stable',
    weakTopics: ['CSS Animations', 'Fetch & Promises', 'CSS Grid'],
    strongTopics: ['DOM Manipulation', 'JavaScript Events'],
    topics: {
      'DOM Manipulation': { count: 0, avgScore: 80, trend: 'stable', level: 'good' },
      'CSS Flexbox': { count: 0, avgScore: 65, trend: 'stable', level: 'fair' },
      'JavaScript Arrays': { count: 0, avgScore: 75, trend: 'improving', level: 'good' },
      'CSS Animations': { count: 0, avgScore: 45, trend: 'stable', level: 'needs_work' },
      'HTML Forms': { count: 0, avgScore: 88, trend: 'stable', level: 'excellent' },
    },
    generatedAt: new Date().toISOString()
  };
}

function getMockRecommendations() {
  return [
    { id: 1, title: 'Centered Navigation Bar', recommendedTopic: 'CSS Flexbox' },
    { id: 2, title: 'Dynamic To-Do List', recommendedTopic: 'DOM Manipulation' },
    { id: 3, title: 'Student Grade Calculator', recommendedTopic: 'JavaScript Arrays' },
    { id: 4, title: 'Animated Loading Screen', recommendedTopic: 'CSS Animations' },
    { id: 5, title: 'Multi-Step Registration Form', recommendedTopic: 'HTML Forms' },
  ];
}

function getMockDailyPlan() {
  return {
    date: new Date().toISOString().split('T')[0],
    totalMinutes: 155,
    motivation: '🚀 Start strong today! Every practice session makes you better.',
    tasks: [
      { id: 'mt1', time: '09:00', duration: 45, type: 'practice', priority: 'high', title: 'Practice: CSS Animations', description: 'Attempt 2 exercises in CSS Animations to strengthen fundamentals', topic: 'CSS Animations', completed: false },
      { id: 'mt2', time: '10:00', duration: 30, type: 'study', priority: 'medium', title: 'Study: Fetch & Promises', description: 'Review notes on async/await patterns and fetch API', topic: 'Fetch & Promises', completed: false },
      { id: 'mt3', time: '14:00', duration: 60, type: 'challenge', priority: 'high', title: 'Daily Coding Challenge', description: 'Solve one medium-difficulty problem and submit', topic: 'CSS Animations', completed: false },
      { id: 'mt4', time: '16:00', duration: 20, type: 'review', priority: 'low', title: 'Apply: DOM Manipulation', description: 'Build a small project feature using your DOM Manipulation strength', topic: 'DOM Manipulation', completed: false },
    ],
    exams: []
  };
}
