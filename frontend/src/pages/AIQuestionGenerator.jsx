import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Save, RefreshCw, BookOpen, ChevronDown, ChevronUp,
  Code2, Layers, Check, Filter, Brain, Cpu, Star, AlertCircle, X,
  ArrowRight, Copy, Eye
} from 'lucide-react';

const TOPICS = [
  { name: 'CSS Flexbox', icon: '📐', color: '#f59e0b' },
  { name: 'CSS Grid', icon: '🔲', color: '#10b981' },
  { name: 'DOM Manipulation', icon: '🌐', color: '#3b82f6' },
  { name: 'JavaScript Arrays', icon: '📋', color: '#8b5cf6' },
  { name: 'JavaScript Functions', icon: '⚙️', color: '#6c63ff' },
  { name: 'JavaScript Events', icon: '⚡', color: '#ef4444' },
  { name: 'HTML Forms', icon: '📝', color: '#06b6d4' },
  { name: 'CSS Animations', icon: '✨', color: '#f43f5e' },
  { name: 'Responsive Design', icon: '📱', color: '#84cc16' },
  { name: 'JavaScript Objects', icon: '🧩', color: '#a855f7' },
  { name: 'Fetch & Promises', icon: '🔗', color: '#14b8a6' },
  { name: 'LocalStorage', icon: '💾', color: '#f97316' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: '#10b981', desc: 'Beginner friendly' },
  { value: 'medium', label: 'Medium', color: '#f59e0b', desc: 'Intermediate level' },
  { value: 'hard', label: 'Hard', color: '#ef4444', desc: 'Advanced concepts' },
];

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

export default function AIQuestionGenerator() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'bank'
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankFilter, setBankFilter] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(setAiStatus)
      .catch(() => {});
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const generate = async () => {
    if (!selectedTopic) {
      showToast('Please select a topic first', 'error');
      return;
    }
    setGenerating(true);
    setQuestions([]);
    setExpandedIdx(null);
    setSaved({});
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, difficulty, count })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setQuestions(data.questions || []);
      setExpandedIdx(0);
      showToast(`✨ Generated ${data.questions.length} question(s) ${data.source === 'gemini' ? 'via Gemini AI' : 'from question bank'}!`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const saveQuestion = async (q, idx) => {
    setSaving(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch('/api/ai/generate-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: q.topic || selectedTopic,
          difficulty: q.difficulty || difficulty,
          overrides: { title: q.title, description: q.description }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(prev => ({ ...prev, [idx]: true }));
      showToast(`✅ "${q.title}" saved to question bank!`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(prev => ({ ...prev, [idx]: false }));
    }
  };

  const loadBank = async () => {
    try {
      const res = await fetch('/api/ai/question-bank');
      const data = await res.json();
      setBankQuestions(data.questions || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'bank') loadBank();
  }, [activeTab]);

  const copyCode = (q, idx) => {
    const code = `// ${q.title}\n// HTML:\n${q.starter_code?.html || ''}\n\n// CSS:\n${q.starter_code?.css || ''}\n\n// JS:\n${q.starter_code?.js || ''}`;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const filteredBank = bankFilter
    ? bankQuestions.filter(q =>
        q.title?.toLowerCase().includes(bankFilter.toLowerCase()) ||
        q.topic?.toLowerCase().includes(bankFilter.toLowerCase())
      )
    : bankQuestions;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a1a 100%)', color: '#cdd6f4', fontFamily: "'Inter', sans-serif" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 9999,
              background: toast.type === 'error' ? '#2a1a1a' : '#1a2a1a',
              border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
              borderRadius: 12, padding: '12px 20px', maxWidth: 360,
              color: toast.type === 'error' ? '#f87171' : '#6ee7b7',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span style={{ fontSize: 14 }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(108,99,255,0.4)'
            }}>
              <Brain size={28} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #a78bfa, #6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI Question Generator
              </h1>
              <p style={{ margin: 0, color: '#7c7c9a', fontSize: 14 }}>
                Generate programming challenges powered by Google Gemini AI
              </p>
            </div>
          </div>

          {/* AI Status Badge */}
          {aiStatus && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
              padding: '6px 16px', borderRadius: 99,
              background: aiStatus.geminiEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${aiStatus.geminiEnabled ? '#10b981' : '#f59e0b'}`,
              fontSize: 13, color: aiStatus.geminiEnabled ? '#6ee7b7' : '#fcd34d'
            }}>
              <Cpu size={14} />
              {aiStatus.geminiEnabled ? 'Gemini AI Active' : `Question Bank (${aiStatus.totalBankQuestions} questions)`}
            </div>
          )}
        </motion.div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[
            { id: 'generator', label: 'Generate', icon: Sparkles },
            { id: 'bank', label: 'Question Bank', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'generator' ? (
            <motion.div key="generator" initial="hidden" animate="visible" variants={stagger}>

              {/* Topic Selection */}
              <motion.div variants={fadeIn} style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} /> Select Topic
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {TOPICS.map(t => (
                    <motion.button
                      key={t.name}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedTopic(t.name)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: selectedTopic === t.name ? `2px solid ${t.color}` : '2px solid rgba(255,255,255,0.08)',
                        background: selectedTopic === t.name ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: selectedTopic === t.name ? t.color : '#9ca3af',
                        fontSize: 14,
                        fontWeight: selectedTopic === t.name ? 600 : 400,
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: selectedTopic === t.name ? `0 0 20px ${t.color}25` : 'none'
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span>{t.name}</span>
                      {selectedTopic === t.name && <Check size={14} style={{ marginLeft: 'auto' }} />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Difficulty + Count */}
              <motion.div variants={fadeIn} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Difficulty */}
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} /> Difficulty
                  </h2>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDifficulty(d.value)}
                        style={{
                          flex: 1, padding: '10px 8px', borderRadius: 10,
                          border: difficulty === d.value ? `2px solid ${d.color}` : '2px solid rgba(255,255,255,0.08)',
                          background: difficulty === d.value ? `${d.color}15` : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer', color: difficulty === d.value ? d.color : '#6b7280',
                          fontSize: 13, fontWeight: 600, transition: 'all 0.2s', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 2 }}>
                          {d.value === 'easy' ? '🟢' : d.value === 'medium' ? '🟡' : '🔴'}
                        </div>
                        {d.label}
                        <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400, marginTop: 2 }}>{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={18} /> Number of Questions
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        style={{
                          flex: 1, padding: '12px 8px', borderRadius: 10,
                          border: count === n ? '2px solid #6c63ff' : '2px solid rgba(255,255,255,0.08)',
                          background: count === n ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer', color: count === n ? '#a78bfa' : '#6b7280',
                          fontSize: 18, fontWeight: 700, transition: 'all 0.2s'
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Generate Button */}
              <motion.div variants={fadeIn} style={{ marginBottom: '2.5rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(108,99,255,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generate}
                  disabled={generating}
                  style={{
                    width: '100%', padding: '18px', borderRadius: 14, border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                    background: generating
                      ? 'rgba(108,99,255,0.3)'
                      : 'linear-gradient(135deg, #6c63ff 0%, #a855f7 50%, #6c63ff 100%)',
                    backgroundSize: '200% 200%',
                    color: 'white', fontSize: '1.1rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    boxShadow: '0 4px 24px rgba(108,99,255,0.35)',
                    transition: 'all 0.3s'
                  }}
                >
                  {generating ? (
                    <>
                      <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={22} />
                      Generate {count} Question{count > 1 ? 's' : ''} {selectedTopic ? `— ${selectedTopic}` : ''}
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </motion.div>

              {/* Generated Questions */}
              <AnimatePresence>
                {questions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={18} /> Generated Questions ({questions.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {questions.map((q, idx) => (
                        <QuestionCard
                          key={idx}
                          q={q}
                          idx={idx}
                          expanded={expandedIdx === idx}
                          onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                          onSave={() => saveQuestion(q, idx)}
                          saving={saving[idx]}
                          savedOk={saved[idx]}
                          onCopy={() => copyCode(q, idx)}
                          copied={copiedIdx === idx}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="bank" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Filter size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input
                    type="text"
                    placeholder="Filter by topic or title..."
                    value={bankFilter}
                    onChange={e => setBankFilter(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px 10px 40px',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, color: '#cdd6f4', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ color: '#6b7280', fontSize: 14, whiteSpace: 'nowrap' }}>
                  {filteredBank.length} questions
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredBank.map((q, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '16px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{q.title}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: 11,
                          background: q.difficulty === 'easy' ? 'rgba(16,185,129,0.15)' : q.difficulty === 'hard' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: q.difficulty === 'easy' ? '#6ee7b7' : q.difficulty === 'hard' ? '#fca5a5' : '#fcd34d'
                        }}>
                          {q.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{q.topic}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setActiveTab('generator'); setSelectedTopic(q.topic); setDifficulty(q.difficulty); }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(108,99,255,0.4)', background: 'rgba(108,99,255,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: 12 }}
                      >
                        Use as Template
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.3); border-radius: 3px; }
        textarea { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
      `}</style>
    </div>
  );
}

function QuestionCard({ q, idx, expanded, onToggle, onSave, saving, savedOk, onCopy, copied }) {
  const diffColor = q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'hard' ? '#ef4444' : '#f59e0b';
  const topicInfo = { name: q.topic || 'Programming', color: '#6c63ff' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: expanded ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
        transition: 'box-shadow 0.3s'
      }}
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Code2 size={18} color="#a78bfa" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {idx + 1}. {q.title}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: `${diffColor}18`, color: diffColor }}>
              {q.difficulty}
            </span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: 'rgba(108,99,255,0.12)', color: '#a78bfa' }}>
              {q.topic}
            </span>
            {q.source === 'gemini' && (
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>
                ✦ Gemini
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); onCopy(); }}
            title="Copy starter code"
            style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', color: copied ? '#6ee7b7' : '#6b7280', display: 'flex', alignItems: 'center' }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); onSave(); }}
            disabled={saving || savedOk}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: saving || savedOk ? 'not-allowed' : 'pointer',
              background: savedOk ? 'rgba(16,185,129,0.2)' : 'rgba(108,99,255,0.2)',
              color: savedOk ? '#6ee7b7' : '#a78bfa', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            {saving ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : savedOk ? <Check size={13} /> : <Save size={13} />}
            {savedOk ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </motion.button>
          {expanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Description */}
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</h4>
                <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px 16px', whiteSpace: 'pre-wrap' }}>
                  {q.description}
                </div>
              </div>

              {/* Hints */}
              {q.hints?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Hints</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.hints.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                        <span style={{ color: '#6c63ff', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Starter Code Tabs */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📄 Starter Code</h4>
              <CodePreview files={q.starter_code || {}} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CodePreview({ files }) {
  const [tab, setTab] = useState('html');
  const tabs = [
    { id: 'html', label: 'HTML', color: '#f97316' },
    { id: 'css', label: 'CSS', color: '#3b82f6' },
    { id: 'js', label: 'JS', color: '#f59e0b' }
  ];

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', background: '#0d1117' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? '#161b22' : 'transparent',
              color: tab === t.id ? t.color : '#6b7280',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#0d1117', padding: 16, maxHeight: 300, overflowY: 'auto' }}>
        <pre style={{ margin: 0, fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <code>{files[tab] || '// No starter code for this section'}</code>
        </pre>
      </div>
    </div>
  );
}
