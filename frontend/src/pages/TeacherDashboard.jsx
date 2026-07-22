import { useState, useEffect } from 'react';
import { Plus, BookOpen, FileCode, CheckCircle2, Settings2, Trash2, Edit3, Wrench, BarChart3, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TrainerPanel from './TrainerPanel';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = String(searchParams.get('tab') || 'overview').toLowerCase();
  const [tab, setTab] = useState(
    initialTab === 'builder' || initialTab === 'analytics' ? initialTab : 'overview'
  );
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [submissionCounts, setSubmissionCounts] = useState({});

  useEffect(() => {
    const t = String(searchParams.get('tab') || 'overview').toLowerCase();
    if (t === tab) return;
    if (t === 'builder' || t === 'analytics' || t === 'overview') setTab(t);
  }, [searchParams, tab]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          fetch('/api/questions'),
          fetch('/api/submissions?limit=200')
        ]);

        const qJson = await qRes.json().catch(() => ({}));
        const sJson = await sRes.json().catch(() => ([]));

        const questions = Array.isArray(qJson?.questions) ? qJson.questions : [];
        const submissions = Array.isArray(sJson) ? sJson : [];

        const counts = {};
        const students = new Set();
        let scoreSum = 0;
        let scoreN = 0;

        for (const s of submissions) {
          const qid = Number(s?.question_id);
          if (qid) counts[qid] = (counts[qid] || 0) + 1;
          if (s?.student_id != null) students.add(String(s.student_id));
          const ts = Number(s?.total_score);
          if (Number.isFinite(ts)) {
            scoreSum += ts;
            scoreN += 1;
          }
        }

        setSubmissionCounts(counts);

        setCourses([{
          id: 1,
          title: "Modern Frontend Fundamentals",
          questions,
          studentCount: students.size,
          avgScore: scoreN ? Math.round(scoreSum / scoreN) : null
        }]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  const deleteQuestion = async (qid) => {
    const id = Number(qid);
    if (!id) return;
    const ok = window.confirm(`Delete Question ${id}? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setCourses((prev) =>
        prev.map((c) => ({ ...c, questions: (c.questions || []).filter((q) => Number(q.id) !== id) }))
      );
    } catch (e) {
      alert(e?.message || 'Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Teacher Portal</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your curriculum and student assessments</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/ai-questions')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', color: 'white', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 16px rgba(108,99,255,0.35)', transition: 'all 0.2s' }}
          >
            <Sparkles size={18} /> AI Generate
          </button>
          <button 
            onClick={() => navigate('/teacher/editor')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Plus size={20} /> Create Question
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => { setTab('overview'); setSearchParams({ tab: 'overview' }); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'overview' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <BookOpen size={16} /> Overview
        </button>
        <button
          onClick={() => { setTab('builder'); setSearchParams({ tab: 'builder' }); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'builder' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Wrench size={16} /> Spec Builder
        </button>
        <button
          onClick={() => { setTab('analytics'); setSearchParams({ tab: 'analytics' }); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'analytics' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {tab === 'overview' && (loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid gap-8">
          {courses.map(course => (
            <section key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
                    <p className="text-sm text-gray-500 font-medium">
                      {course.questions.length} Questions • {course.studentCount} Students Enrolled • Avg Score: {course.avgScore ?? '--'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button
                     className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
                     onClick={() => navigate('/settings')}
                     title="Course settings"
                     aria-label="Course settings"
                   >
                     <Settings2 size={20} />
                   </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-4">Question</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Submissions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {course.questions.map((q, idx) => (
                      <motion.tr 
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{q.title}</div>
                              <div className="text-xs text-gray-500">Order: {idx + 1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} /> Live
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-gray-600">{submissionCounts[Number(q.id)] ?? 0}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => navigate(`/teacher/editor/${q.id}`)}
                               className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                             >
                               <Edit3 size={18} />
                             </button>
                             <button
                               onClick={() => deleteQuestion(q.id)}
                               disabled={deletingId === Number(q.id)}
                               className="p-2 text-gray-400 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                               title="Delete question"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-gray-50/30 border-t border-gray-50">
                <button
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 font-bold transition-all flex items-center justify-center gap-2"
                  onClick={() => navigate('/teacher/editor')}
                  title="Create a new question"
                >
                  <Plus size={18} /> Add Module to Course
                </button>
              </div>
            </section>
          ))}
        </div>
      ))}

      {tab === 'builder' && (
        <TrainerPanel embedded initialTab="builder" />
      )}

      {tab === 'analytics' && (
        <TrainerPanel embedded initialTab="analytics" />
      )}
    </div>
  );
}

