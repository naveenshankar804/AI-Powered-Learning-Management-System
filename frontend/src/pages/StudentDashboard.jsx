import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, CheckCircle2, AlertCircle, Maximize2, RotateCcw, Loader2, Sparkles, Server, Check } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from '../components/workspace/CodeEditor';
import PreviewFrame from '../components/workspace/PreviewFrame';
import QuestionPanel from '../components/workspace/QuestionPanel';
import { cn } from '../utils/utils';
import { useToast } from '../components/ui/use-toast';
import { buildPreviewDocument } from '../components/workspace/previewDocument';

const EVALUATION_STAGES = [
  { id: 'package', label: 'Packaging submission', duration: 600 },
  { id: 'sandbox', label: 'Launching headless sandbox', duration: 800 },
  { id: 'dom', label: 'Running DOM & CSS assertions', duration: 1200 },
  { id: 'interaction', label: 'Simulating user interactions', duration: 1000 },
  { id: 'visual', label: 'Computing visual diff heatmaps', duration: 1500 },
  { id: 'ai', label: 'Generating AI feedback insights', duration: 1100 },
  { id: 'score', label: 'Finalizing score rubric', duration: 500 }
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('html');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [questionDetails, setQuestionDetails] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(true);

  const [starterCode, setStarterCode] = useState({ html: '', css: '', js: '' });
  const [code, setCode] = useState({ html: '', css: '', js: '' });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStageIndex, setEvalStageIndex] = useState(-1);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const previewDoc = useMemo(() => buildPreviewDocument({ html: code.html, css: code.css, js: code.js }), [code]);

  useEffect(() => {
    const blob = new Blob([previewDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewDoc]);

  const openPreviewInNewTab = () => {
    if (!previewUrl) {
      toast({ title: 'Preview Not Ready', description: 'The preview is still being prepared.', variant: 'destructive' });
      return;
    }

    const w = window.open(previewUrl, '_blank');
    if (!w) {
      toast({ title: 'Popup Blocked', description: 'Allow popups to open the full preview.', variant: 'destructive' });
      return;
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      setQuestionsLoading(true);
      try {
        const res = await fetch('/api/questions');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load questions');
        if (cancelled) return;
        const qs = Array.isArray(data.questions) ? data.questions : [];
        setQuestions(qs);
        const fromUrl = searchParams.get('question');
        const desired = fromUrl != null ? Number(fromUrl) : null;
        if (qs.length > 0) {
          setSelectedQuestionId((prev) => {
            if (desired && qs.some((x) => Number(x.id) === desired)) return desired;
            return prev == null ? qs[0].id : prev;
          });
        }
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load questions.', variant: 'destructive' });
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [toast, searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestionDetails() {
      if (!selectedQuestionId) return;
      setQuestionLoading(true);
      try {
        const res = await fetch(`/api/questions/${selectedQuestionId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load question');
        if (cancelled) return;
        setQuestionDetails(data);
        const files = Array.isArray(data.files) ? data.files : [];
        const next = {
          html: files.find((f) => f.type === 'html')?.content ?? '',
          css: files.find((f) => f.type === 'css')?.content ?? '',
          js: files.find((f) => f.type === 'js')?.content ?? ''
        };
        setStarterCode(next);
        setCode(next);
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load question.', variant: 'destructive' });
      } finally {
        if (!cancelled) setQuestionLoading(false);
      }
    }
    loadQuestionDetails();
    return () => { cancelled = true; };
  }, [selectedQuestionId, toast]);

  const question = (() => {
    const q = questionDetails?.question || {};
    const spec = questionDetails?.testSpec || {};
    const domHints = Array.isArray(spec?.tests?.dom) ? spec.tests.dom.map((t) => t.hint).filter(Boolean) : [];
    const cssHints = Array.isArray(spec?.tests?.css) ? spec.tests.css.map((t) => t.hint).filter(Boolean) : [];
    const requirements = [...domHints, ...cssHints].filter(Boolean).slice(0, 6);
    return {
      title: q.title || 'Practice Workspace',
      difficulty: spec?.difficulty || 'Medium',
      description: q.description || '',
      requirements: requirements.length > 0 ? requirements : ["Complete the UI requirements", "Match layout and hover states", "Ensure click interaction works"]
    };
  })();

  const handleRunTests = async () => {
    if (!selectedQuestionId) {
      toast({ title: 'No Question Selected', description: 'Please select a question first.', variant: 'destructive' });
      return;
    }
      setIsEvaluating(true);
      setEvalStageIndex(0);
      setActiveSubmissionId(null);
  
      try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: selectedQuestionId,
          student_id: 1,  // Using Demo Student ID 1
          html_content: code.html,
          css_content: code.css,
          js_content: code.js
        })
      });

      const data = await res.json();
      
      if (!res.ok || data.status === 'failed') {
        toast({ title: 'Validation Failed', description: data.error || data.message || 'Syntax error', variant: 'destructive' });
        setIsEvaluating(false);
        return;
      }

        const submissionId = data.submission_id;
        setActiveSubmissionId(submissionId);
  
        // Listen to real-time events from the BullMQ Worker
        const eventSource = new EventSource(`/api/submissions/${submissionId}/progress`);

      eventSource.onmessage = (e) => {
        const eventData = JSON.parse(e.data);
        
        if (eventData.status === 'completed' || eventData.status === 'failed') {
          eventSource.close();
          setEvalStageIndex(EVALUATION_STAGES.length); // Trigger UI completion state
          
          setTimeout(() => {
            toast({
              title: "Evaluation Completed",
              description: "Redirecting to your detailed results report...",
            });
            navigate(`/results/${submissionId}`);
          }, 1000);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Fallback incase SSE stream drops
        setTimeout(() => navigate(`/results/${submissionId}`), 5000);
      };

    } catch (error) {
      toast({ title: 'Connection Error', description: 'Failed to connect to the evaluation engine.', variant: 'destructive' });
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    // Animate the pipeline stages up to the second-to-last stage while waiting for the server
    if (evalStageIndex >= 0 && evalStageIndex < EVALUATION_STAGES.length - 1) {
      const timer = setTimeout(() => {
        setEvalStageIndex(prev => prev + 1);
      }, EVALUATION_STAGES[evalStageIndex].duration);
      return () => clearTimeout(timer);
    }
    // Auto-redirect is now handled by the SSE listener when the actual backend job finishes
  }, [evalStageIndex]);

  return (
    <div className="h-full flex flex-col gap-4 relative">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Practice Workspace</h2>
          <p className="text-sm text-gray-500">Evaluation Engine v2.0</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Question</span>
            <select
              value={selectedQuestionId ?? ''}
              onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
              disabled={questionsLoading}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 disabled:opacity-60"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
            {questionLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
        </div>
        <div className="flex gap-3">
           <button
             onClick={() => {
               setCode(starterCode);
               toast({ title: "Code Reset", description: "Your code has been reset to the starter template." });
             }}
             className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors shadow-sm"
           >
             <RotateCcw size={16} /> Reset Code
           </button>
           <button 
             onClick={handleRunTests}
             disabled={isEvaluating || !selectedQuestionId}
             className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
           >
             {isEvaluating ? (
               <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80"></div> Evaluating...</>
             ) : (
               <><Play size={16} fill="white" /> Submit & Evaluate</>
             )}
           </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-slate-900 text-slate-200 px-4 py-3 text-sm font-semibold border-b border-slate-800 flex items-center justify-between">
            <span>Description</span>
          </div>
          <div className="flex-1 overflow-auto">
             <QuestionPanel question={question} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex flex-col overflow-hidden shadow-emerald-900/5">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <Tabs.List className="flex bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1">
              {['html', 'css', 'js'].map((lang) => (
                <Tabs.Trigger
                  key={lang}
                  value={lang}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-all border border-transparent border-b-0",
                    activeTab === lang 
                      ? "bg-slate-800 text-emerald-400 border-slate-700 shadow-sm" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  )}
                >
                  index.{lang}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div className="flex-1 min-h-0 bg-[#0f172a]">
              <CodeEditor 
                language={activeTab === 'js' ? 'javascript' : activeTab}
                value={code[activeTab]}
                onChange={(val) => setCode(prev => ({ ...prev, [activeTab]: val }))}
              />
            </div>
          </Tabs.Root>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
           <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[300px]">
             <div className="bg-slate-900 text-slate-200 px-4 py-3 text-sm font-semibold border-b border-slate-800 flex items-center justify-between">
                <span>Live Preview</span>
                <button
                  type="button"
                  onClick={openPreviewInNewTab}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Open full preview in new tab"
                  title="Open full preview"
                >
                  <Maximize2 size={14} />
                </button>
             </div>
             <div className="flex-1 relative">
                <PreviewFrame html={code.html} css={code.css} js={code.js} />
             </div>
           </div>

        </div>
      </div>

      {/* Animated Live Evaluation Progress Overlay */}
      <AnimatePresence>
        {isEvaluating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                   {evalStageIndex >= EVALUATION_STAGES.length ? <Check size={20} className="text-emerald-500" /> : <Server size={20} className="animate-pulse" />}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg">Evaluation Pipeline</h3>
                   <p className="text-sm text-gray-500">
                     {activeSubmissionId ? (
                       <>Submission ID: <span className="font-mono text-xs">{activeSubmissionId}</span></>
                     ) : (
                       <>Submitting to worker poolâ€¦</>
                     )}
                   </p>
                 </div>
              </div>

              <div className="space-y-4">
                {EVALUATION_STAGES.map((stage, i) => {
                  const isActive = i === evalStageIndex;
                  const isPast = i < evalStageIndex;
                  return (
                    <div key={stage.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className={cn(
                          "font-medium transition-colors duration-300",
                          isActive ? "text-emerald-600" : isPast ? "text-gray-900" : "text-gray-400"
                        )}>
                          {stage.label}
                        </span>
                        {isActive && <Loader2 size={14} className="text-emerald-500 animate-spin" />}
                        {isPast && <Check size={14} className="text-emerald-500" />}
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: isPast ? "100%" : isActive ? "50%" : 0 }}
                          transition={isActive ? { duration: stage.duration / 1000, ease: "linear" } : { duration: 0.2 }}
                          className={cn(
                            "h-full rounded-full",
                            isPast ? "bg-emerald-500" : "bg-emerald-600"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {evalStageIndex >= EVALUATION_STAGES.length && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} 
                  className="mt-6 bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100 flex items-center justify-center gap-2 font-medium text-sm text-center"
                >
                  <Sparkles size={16} /> Evaluation Complete! Redirecting...
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

