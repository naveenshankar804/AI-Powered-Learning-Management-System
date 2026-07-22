import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Play, CheckCircle2, ChevronRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuestionRoadmap() {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        // Demo/student pages currently use student_id=1. If you add auth later, replace this.
        const studentId = 1;

        const [qRes, sRes] = await Promise.all([
          fetch('/api/questions'),
          fetch(`/api/submissions?student_id=${studentId}&limit=200`)
        ]);

        const qData = await qRes.json().catch(() => ({}));
        const sData = await sRes.json().catch(() => ([]));
        const questions = Array.isArray(qData.questions) ? qData.questions : [];
        const submissions = Array.isArray(sData) ? sData : (Array.isArray(sData.items) ? sData.items : []);

        // Completed if there is at least one completed submission for that question.
        const completedQuestionIds = new Set(
          submissions
            .filter((s) => String(s?.status || '') === 'completed')
            .map((s) => Number(s?.question_id))
            .filter(Boolean)
        );

        // Determine current: first question (by order) not completed.
        const ordered = [...questions].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
        const currentIdx = Math.max(
          0,
          ordered.findIndex((q) => !completedQuestionIds.has(Number(q?.id)))
        );

        setCourse({
          title: 'Modern Frontend Fundamentals',
          questions: ordered.map((q, idx) => {
            const id = Number(q?.id);
            const done = completedQuestionIds.has(id);
            const isCurrent = !done && idx === currentIdx;
            const unlocked = done || idx <= currentIdx;
            return {
              ...q,
              status: done ? 'completed' : isCurrent ? 'current' : unlocked ? 'unlocked' : 'locked'
            };
          })
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadRoadmap();
  }, []);

  if (loading) return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-full mx-auto mb-4" />
      <div className="h-10 w-64 bg-gray-200 rounded-xl mx-auto mb-12" />
      <div className="space-y-12">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-8">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl shrink-0" />
            <div className="flex-1 h-32 bg-gray-100 rounded-3xl" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-sm mb-4">
          <GraduationCap size={18} /> Learning Path
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">{course?.title}</h1>
        <p className="text-gray-500 max-w-xl mx-auto font-medium">Follow this sequence to master the fundamentals of modern frontend development.</p>
      </header>

      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-[39px] top-0 bottom-0 w-1 bg-gray-100 rounded-full" />

        <div className="space-y-12 relative">
          {course?.questions.map((q, idx) => (
            <div key={q.id} className="flex gap-8 relative group">
              {/* Node Icon */}
              <div className="relative z-10">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                    q.status === 'completed' ? 'bg-emerald-500 text-white shadow-emerald-200' :
                    q.status === 'current' ? 'bg-emerald-600 text-white shadow-emerald-200 animate-pulse' :
                    q.status === 'unlocked' ? 'bg-white border-2 border-emerald-100 text-emerald-500 shadow-emerald-100' :
                    'bg-white border-2 border-gray-100 text-gray-300'
                  }`}
                >
                  {q.status === 'completed' ? <CheckCircle2 size={32} /> :
                   q.status === 'current' ? <Play size={32} /> :
                   q.status === 'unlocked' ? <Unlock size={32} /> :
                   <Lock size={32} />}
                </motion.div>
                {/* Step Indicator */}
                <div className="absolute -bottom-2 -right-2 bg-white border border-gray-100 px-2 py-0.5 rounded-md text-[10px] font-black text-gray-400 shadow-sm">
                  0{idx + 1}
                </div>
              </div>

              {/* Content Card */}
              <button 
                onClick={() => q.status !== 'locked' && navigate(`/student?question=${encodeURIComponent(String(q.id))}`)}
                disabled={q.status === 'locked'}
                className={`flex-1 text-left p-6 rounded-3xl border transition-all duration-300 ${
                  q.status === 'locked' ? 'bg-gray-50/50 border-gray-100 opacity-60' :
                  'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 group-hover:-translate-x-1'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xl font-bold ${q.status === 'locked' ? 'text-gray-400' : 'text-gray-900'}`}>{q.title}</h3>
                  <ChevronRight size={20} className={q.status === 'locked' ? 'text-gray-300' : 'text-emerald-400'} />
                </div>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed font-medium">
                  {q.description || "Master this module to unlock the next challenge in your curriculum."}
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    15 mins
                  </div>
                  {q.status === 'current' && (
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

