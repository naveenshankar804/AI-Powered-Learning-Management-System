import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings, BarChart2, Plus, GripVertical, Trash2, Code2, Users, FileSignature, Box, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import CodeEditor from '../components/workspace/CodeEditor';
import { cn } from '../utils/utils';
import { useToast } from '../components/ui/use-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 }
];

const DEFAULT_STARTER_HTML = "<div class='card'>\n  <!-- Start styling here -->\n</div>";

const DOM_ASSERTIONS = [
  { value: 'exists', label: 'Exists' },
  { value: 'count', label: 'Count Equals' },
  { value: 'textIncludes', label: 'Text Includes' },
  { value: 'textEquals', label: 'Text Equals' },
  { value: 'hasClass', label: 'Has Class' },
  { value: 'attributeEquals', label: 'Attribute Equals' },
  { value: 'valueEquals', label: 'Input Value Equals' },
  { value: 'alertCalled', label: 'Alert Called' },
  { value: 'alertIncludes', label: 'Alert Includes Text' }
];

const INTERACTION_ACTIONS = [
  { value: 'click', label: 'Click' },
  { value: 'hover', label: 'Hover' },
  { value: 'type', label: 'Type' },
  { value: 'scroll', label: 'Scroll Into View' },
  { value: 'keypress', label: 'Key Press' },
  { value: 'focus', label: 'Focus' },
  { value: 'select', label: 'Select Option' },
  { value: 'check', label: 'Check' },
  { value: 'uncheck', label: 'Uncheck' },
  { value: 'wait', label: 'Wait' },
  { value: 'waitForSelector', label: 'Wait For Selector' }
];

const assertionNeedsExpected = (assertion) => new Set([
  'count',
  'textIncludes',
  'textEquals',
  'hasClass',
  'attributeEquals',
  'valueEquals',
  'alertIncludes'
]).has(assertion);

const assertionNeedsSelector = (assertion) => !new Set(['alertCalled', 'alertIncludes']).has(assertion);

const actionNeedsSelector = (action) => !new Set(['keypress', 'wait']).has(action);
const actionNeedsValue = (action) => new Set(['type', 'select', 'wait']).has(action);
const actionNeedsKey = (action) => action === 'keypress';

function parseExpectedValue(input) {
  if (typeof input !== 'string') return input;
  const v = input.trim();
  if (!v) return '';
  if ((v.startsWith('[') && v.endsWith(']')) || (v.startsWith('{') && v.endsWith('}'))) {
    try {
      return JSON.parse(v);
    } catch (_) {
      return v;
    }
  }
  return v;
}

export default function TrainerPanel({ initialTab = 'builder', embedded = false } = {}) {
  const [activeTab, setActiveTab] = useState(() => (initialTab || 'builder'));
  const { toast } = useToast();

  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionDescription, setNewQuestionDescription] = useState('');
  const addQuestionRef = useRef(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const [draftLoading, setDraftLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baselineBusy, setBaselineBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowedLibraries, setAllowedLibraries] = useState([]);
  const [starterHtml, setStarterHtml] = useState(DEFAULT_STARTER_HTML);
  const [starterCss, setStarterCss] = useState('');
  const [starterJs, setStarterJs] = useState('');
  const [showStarterEditor, setShowStarterEditor] = useState(false);
  const [showSpecJson, setShowSpecJson] = useState(false);

  useEffect(() => {
    if (!initialTab) return;
    setActiveTab(initialTab);
  }, [initialTab]);

  const [specBase, setSpecBase] = useState({ version: '1.0', viewports: DEFAULT_VIEWPORTS, tests: { dom: [], css: [], interactions: [] } });
  const nextTestIdRef = useRef(3);

  const [tests, setTests] = useState([
    { id: 1, type: 'dom', target: '.card', assertion: 'exists', weight: 10 },
    { id: 2, type: 'css', target: '.card', property: 'display', value: 'flex', weight: 20 }
  ]);
  const [interactionSteps, setInteractionSteps] = useState([]);
  const nextInteractionIdRef = useRef(1);

  const specJson = useMemo(() => {
    const base = specBase && typeof specBase === 'object' ? specBase : {};
    const viewports = Array.isArray(base.viewports) && base.viewports.length > 0 ? base.viewports : DEFAULT_VIEWPORTS;

    const baseTests = base.tests && typeof base.tests === 'object' ? base.tests : {};
    const nextTests = { ...baseTests };
    const dom = [];
    const css = [];

    tests.forEach((t) => {
      const raw = t._raw && typeof t._raw === 'object' ? t._raw : {};
      if (t.type === 'css') {
        if (t.property === 'ruleExists') {
          css.push({
            ...raw,
            testType: 'ruleExists',
            selectorContains: (t.value ?? t.target ?? '').toString(),
            selector: raw.selector || t.target || '',
          });
        } else {
          css.push({
            ...raw,
            selector: t.target || '',
            property: t.property || '',
            expected: parseExpectedValue(t.value ?? ''),
            matcher: raw.matcher || 'equals'
          });
        }
      } else {
        const nextDomTest = {
          ...raw,
          assertion: t.assertion || 'exists'
        };

        if (assertionNeedsSelector(t.assertion)) {
          nextDomTest.selector = t.target || '';
        } else {
          delete nextDomTest.selector;
        }

        if (assertionNeedsExpected(t.assertion)) {
          nextDomTest.expected = parseExpectedValue(t.value ?? '');
        } else {
          delete nextDomTest.expected;
        }

        if (t.assertion === 'attributeEquals') {
          nextDomTest.attribute = t.attribute || '';
        } else {
          delete nextDomTest.attribute;
        }

        dom.push(nextDomTest);
      }
    });

    nextTests.dom = dom;
    nextTests.css = css;
    nextTests.interactions = interactionSteps.map((step) => {
      const nextStep = {
        action: step.action || 'click',
        delay: Number(step.delay) >= 0 ? Number(step.delay) : 50
      };

      if (actionNeedsSelector(step.action)) nextStep.selector = step.selector || '';
      if (actionNeedsValue(step.action)) nextStep.value = step.value ?? '';
      if (actionNeedsKey(step.action)) nextStep.key = step.key || '';
      if (step.waitForVisible && actionNeedsSelector(step.action)) nextStep.waitForVisible = true;
      if (step.clear && step.action === 'type') nextStep.clear = true;

      return nextStep;
    });

    return { ...base, version: base.version || '1.0', viewports, tests: nextTests };
  }, [interactionSteps, specBase, tests]);

  const generateBaseline = async () => {
    if (!selectedQuestionId) return;
    setBaselineBusy(true);
    try {
      const res = await fetch(`/api/questions/${selectedQuestionId}/baseline`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Baseline generation failed');
      toast({
        title: 'Baseline Queued',
        description: `Question ${data.question_id} baseline v${data.version} queued (job: ${data.job_id || 'n/a'}).`
      });
    } catch (e) {
      toast({ title: 'Baseline Failed', description: e?.message || 'Could not queue baseline.', variant: 'destructive' });
    } finally {
      setBaselineBusy(false);
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
        if (qs.length > 0) {
          setSelectedQuestionId((prev) => (prev == null ? qs[0].id : prev));
        }
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load questions.', variant: 'destructive' });
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }

    loadQuestions();
    return () => { cancelled = true; };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      if (!selectedQuestionId) return;
      setDraftLoading(true);
      try {
        const res = await fetch(`/api/trainer/questions/${selectedQuestionId}/draft`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load draft');

        if (cancelled) return;

        const q = data.question || {};
        const files = Array.isArray(data.files) ? data.files : [];
        const spec = data.testSpec && typeof data.testSpec === 'object' ? data.testSpec : null;

        setTitle(typeof q.title === 'string' ? q.title : '');
        setDescription(typeof q.description === 'string' ? q.description : '');
        setAllowedLibraries(Array.isArray(q.allowed_libraries) ? q.allowed_libraries : []);

        setStarterHtml(files.find((f) => f.type === 'html')?.content ?? DEFAULT_STARTER_HTML);
        setStarterCss(files.find((f) => f.type === 'css')?.content ?? '');
        setStarterJs(files.find((f) => f.type === 'js')?.content ?? '');

        const base = spec || { version: '1.0', viewports: DEFAULT_VIEWPORTS, tests: { dom: [], css: [], interactions: [] } };
        setSpecBase(base);

        const domSpec = Array.isArray(base?.tests?.dom) ? base.tests.dom : [];
        const cssSpec = Array.isArray(base?.tests?.css) ? base.tests.css : [];
        const interactionSpec = Array.isArray(base?.tests?.interactions) ? base.tests.interactions : [];

        const mapped = [];
        domSpec.forEach((t, idx) => {
          const expected = t?.expected;
          mapped.push({
            id: idx + 1,
            type: 'dom',
            target: t?.selector || '',
            assertion: t?.assertion || 'exists',
            attribute: t?.attribute || '',
            value: Array.isArray(expected) ? JSON.stringify(expected) : (expected ?? '').toString(),
            weight: 10,
            _raw: t
          });
        });
        cssSpec.forEach((t, idx) => {
          const id = mapped.length + idx + 1;
          if (t?.testType === 'ruleExists') {
            mapped.push({
              id,
              type: 'css',
              target: t?.selector || '',
              property: 'ruleExists',
              value: t?.selectorContains || t?.selector || '',
              weight: 10,
              _raw: t
            });
          } else {
            const expected = t?.expected;
            mapped.push({
              id,
              type: 'css',
              target: t?.selector || '',
              property: t?.property || '',
              value: Array.isArray(expected) ? JSON.stringify(expected) : (expected ?? '').toString(),
              weight: 10,
              _raw: t
            });
          }
        });

        if (mapped.length > 0) {
          setTests(mapped);
          nextTestIdRef.current = mapped.length + 1;
        } else {
          setTests([
            { id: 1, type: 'dom', target: '.card', assertion: 'exists', weight: 10 },
            { id: 2, type: 'css', target: '.card', property: 'display', value: 'flex', weight: 20 }
          ]);
          nextTestIdRef.current = 3;
        }

        const mappedInteractions = interactionSpec.map((step, idx) => ({
          id: idx + 1,
          action: step?.action || 'click',
          selector: step?.selector || '',
          value: step?.value ?? '',
          key: step?.key || '',
          delay: Number(step?.delay) >= 0 ? Number(step.delay) : 50,
          waitForVisible: Boolean(step?.waitForVisible),
          clear: Boolean(step?.clear)
        }));
        setInteractionSteps(mappedInteractions);
        nextInteractionIdRef.current = mappedInteractions.length + 1;
      } catch (e) {
        toast({
          title: 'Draft Load Failed',
          description: e?.message || 'Could not load question draft.',
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    }

    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [selectedQuestionId, toast]);

  const updateTest = (id, patch) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTest = (id) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
  };

  const addTest = () => {
    const id = nextTestIdRef.current++;
    setTests((prev) => [
      ...prev,
      { id, type: 'dom', target: '', assertion: 'exists', weight: 10 }
    ]);
  };

  const updateInteractionStep = (id, patch) => {
    setInteractionSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const removeInteractionStep = (id) => {
    setInteractionSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const addInteractionStep = () => {
    const id = nextInteractionIdRef.current++;
    setInteractionSteps((prev) => [
      ...prev,
      {
        id,
        action: 'click',
        selector: '',
        value: '',
        key: 'Enter',
        delay: 50,
        waitForVisible: true,
        clear: false
      }
    ]);
  };

  const handleSaveDraft = async () => {
    if (!selectedQuestionId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trainer/questions/${selectedQuestionId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          allowed_libraries: allowedLibraries,
          starter_html: starterHtml,
          starter_css: starterCss,
          starter_js: starterJs,
          spec_json: specJson
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save draft');

      toast({
        title: data?.baseline?.queued ? 'Draft Saved & Queued' : 'Draft Saved',
        description: data?.baseline?.queued
          ? `Your changes were saved and baseline v${data.baseline.version} was queued automatically.`
          : 'Your changes have been saved.'
      });
    } catch (e) {
      toast({
        title: 'Save Failed',
        description: e?.message || 'Could not save draft.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuestion = async () => {
    const t = newQuestionTitle.trim();
    if (!t) {
      toast({ title: 'Title Required', description: 'Please enter a question title.', variant: 'destructive' });
      return;
    }
    setCreatingQuestion(true);
    try {
      const res = await fetch('/api/trainer/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, description: newQuestionDescription })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create question');
      const q = data.question;
      toast({
        title: data?.baseline?.queued ? 'Question Created & Queued' : 'Question Created',
        description: data?.baseline?.queued
          ? `New question is ready to edit and baseline v${data.baseline.version} is generating now.`
          : 'New question is ready to edit.'
      });
      setNewQuestionTitle('');
      setNewQuestionDescription('');
      // Refresh list and select the new question.
      const listRes = await fetch('/api/questions');
      const listData = await listRes.json().catch(() => ({}));
      const qs = Array.isArray(listData.questions) ? listData.questions : [];
      setQuestions(qs);
      if (q?.id) setSelectedQuestionId(q.id);
    } catch (e) {
      toast({ title: 'Create Failed', description: e?.message || 'Could not create question.', variant: 'destructive' });
    } finally {
      setCreatingQuestion(false);
    }
  };
  
  // Mock Analytics Data
  const analyticsData = {
    avgScore: 78.5,
    avgExecution: '1.2s',
    totalSubmissions: 342,
    passRate: '64%',
    scoreHistogram: [12, 25, 68, 142, 95],
    failedTests: [
      { test: '.profile-card display:flex', count: 124 },
      { test: 'button:hover background-color', count: 89 },
      { test: '.avatar border-radius', count: 45 }
    ]
  };

  return (
    <div className={embedded ? "w-full flex flex-col gap-6" : "max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12"}>
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{embedded ? 'Teacher Tools' : 'Trainer Dashboard'}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage assessment questions, test specs, and analyze cohort performance.</p>
        </div>

        {activeTab === 'builder' && (
          <button
            onClick={generateBaseline}
            disabled={baselineBusy || !selectedQuestionId}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Generate baseline screenshots from the reference solution (FR-2)"
          >
            {baselineBusy ? <Loader2 size={16} className="animate-spin" /> : <Box size={16} />}
            Generate Baseline
          </button>
        )}
        
        <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
          <button 
            onClick={() => setActiveTab('builder')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'builder' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Settings size={16} /> Content Builder
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'analytics' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BarChart2 size={16} /> Cohort Analytics
          </button>
        </div>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Question List */}
          <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-900">Questions</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestion(true);
                    setTimeout(() => addQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
                {questionsLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {questions.length === 0 && !questionsLoading ? (
                <div className="text-sm text-gray-500">No questions yet.</div>
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl border transition-colors",
                        selectedQuestionId === q.id
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-gray-100 bg-white hover:bg-gray-50 text-gray-800"
                      )}
                    >
                      <div className="text-sm font-semibold truncate">{q.title}</div>
                      <div className="text-xs text-gray-500 truncate">ID: {q.id}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={addQuestionRef} className="border-t border-gray-100 bg-gray-50/30">
              <button
                type="button"
                onClick={() => setShowAddQuestion((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus size={16} className="text-emerald-600" />
                  Add Question
                </span>
                {showAddQuestion ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {showAddQuestion && (
              <div className="p-4 pt-2 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">New Question Title</label>
                <input
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                  placeholder="e.g. Build a Pricing Card"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                <textarea
                  rows="2"
                  value={newQuestionDescription}
                  onChange={(e) => setNewQuestionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 resize-none"
                  placeholder="Short description…"
                />
              </div>
              <button
                onClick={handleCreateQuestion}
                disabled={creatingQuestion}
                className={cn(
                  "w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-sm transition-colors inline-flex items-center justify-center gap-2",
                  creatingQuestion && "opacity-70 cursor-not-allowed hover:bg-emerald-600"
                )}
              >
                {creatingQuestion ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Question
              </button>
              </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-6">
           {/* Question Metadata config */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
             <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSignature size={18} className="text-emerald-600" />
                  <h2 className="font-bold text-gray-900">Question Definition</h2>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {selectedQuestionId ? `ID: ${selectedQuestionId}` : 'No question selected'}
                </div>
             </div>
             <div className="p-6 space-y-5">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Title</label>
                 <input
                   type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                   placeholder="Responsive Profile Card"
                 />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Markdown Description</label>
                 <textarea
                   rows="4"
                   className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all resize-none"
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   placeholder="Build a profile card matching the design specs..."
                 />
               </div>
               
               <div className="border border-gray-200 rounded-xl overflow-hidden">
                 <button
                   type="button"
                   onClick={() => setShowStarterEditor((v) => !v)}
                   className="w-full bg-slate-900 px-4 py-2 flex justify-between items-center text-slate-200 text-sm font-semibold"
                 >
                   <span className="flex items-center gap-2"><Code2 size={14}/> Starter Template (index.html)</span>
                   {showStarterEditor ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                 </button>
                 {!showStarterEditor ? (
                   <div className="bg-slate-900 px-4 py-3 text-xs text-slate-400 font-mono border-t border-slate-800 whitespace-pre-wrap">
                     {starterHtml.split('\\n').slice(0, 4).join('\\n')}
                     {starterHtml.split('\\n').length > 4 ? '\\n...' : ''}
                   </div>
                 ) : (
                   <div className="h-[260px] bg-slate-900 border-t border-slate-800">
                     <CodeEditor
                       language="html"
                       value={starterHtml}
                       onChange={(v) => setStarterHtml(v ?? '')}
                     />
                   </div>
                 )}
               </div>
               
               <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={!selectedQuestionId || draftLoading || saving}
                    className={cn(
                      "bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-colors inline-flex items-center gap-2",
                      (!selectedQuestionId || draftLoading || saving) && "opacity-70 cursor-not-allowed hover:bg-emerald-600"
                    )}
                  >
                    {(draftLoading || saving) && <Loader2 size={16} className="animate-spin" />}
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
               </div>
             </div>
           </div>

           {/* Visual Test Builder */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
             <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Box size={18} className="text-emerald-600" />
                  <h2 className="font-bold text-gray-900">Visual Test Spec Builder</h2>
                </div>
                <button
                  onClick={addTest}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={14} /> Add Assertion
                </button>
              </div>
              
              <div className="p-5 bg-gray-50 flex-1 overflow-y-auto">
                 <div className="space-y-3">
                   {tests.map((test) => (
                     <div key={test.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4 group">
                        <GripVertical size={20} className="text-gray-300 mt-2 cursor-grab active:cursor-grabbing hover:text-gray-500" />
                        <div className="flex-1 grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Assertion Type</label>
                             <select
                               className="w-full text-sm border-gray-200 rounded-md bg-gray-50 focus:bg-white"
                               value={test.type}
                               onChange={(e) => {
                                 const nextType = e.target.value;
                                  if (nextType === 'css') {
                                   updateTest(test.id, {
                                     type: nextType,
                                     property: test.property || '',
                                     value: test.value ?? '',
                                     assertion: undefined,
                                     attribute: '',
                                     _raw: undefined
                                   });
                                 } else {
                                   updateTest(test.id, {
                                     type: nextType,
                                     assertion: test.assertion || 'exists',
                                     property: undefined,
                                     value: test.value ?? '',
                                     attribute: test.attribute ?? '',
                                     _raw: undefined
                                   });
                                 }
                               }}
                             >
                                <option value="dom">DOM Structure</option>
                                <option value="css">Computed CSS</option>
                             </select>
                           </div>
                           {test.type === 'dom' && (
                             <div>
                               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">DOM Assertion</label>
                               <select
                                 className="w-full text-sm border-gray-200 rounded-md bg-gray-50 focus:bg-white"
                                 value={test.assertion || 'exists'}
                                 onChange={(e) => updateTest(test.id, {
                                   assertion: e.target.value,
                                   attribute: e.target.value === 'attributeEquals' ? (test.attribute || '') : '',
                                   value: assertionNeedsExpected(e.target.value) ? (test.value ?? '') : ''
                                 })}
                               >
                                 {DOM_ASSERTIONS.map((option) => (
                                   <option key={option.value} value={option.value}>{option.label}</option>
                                 ))}
                               </select>
                             </div>
                           )}
                           {assertionNeedsSelector(test.assertion || 'exists') && (
                             <div>
                               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Target Selector</label>
                               <input
                                 type="text"
                                 className="w-full text-sm border-gray-200 rounded-md font-mono text-emerald-600"
                                 value={test.target}
                                 onChange={(e) => updateTest(test.id, { target: e.target.value })}
                               />
                             </div>
                           )}
                           {test.type === 'css' && (
                             <>
                               <div>
                                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">CSS Property</label>
                                 <input
                                   type="text"
                                   className="w-full text-sm border-gray-200 rounded-md font-mono"
                                   value={test.property || ''}
                                   onChange={(e) => updateTest(test.id, { property: e.target.value })}
                                 />
                               </div>
                               <div>
                                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Expected Value</label>
                                 <input
                                   type="text"
                                   className="w-full text-sm border-gray-200 rounded-md font-mono"
                                   value={test.value ?? ''}
                                   onChange={(e) => updateTest(test.id, { value: e.target.value })}
                                 />
                               </div>
                             </>
                           )}
                           {test.type === 'dom' && test.assertion === 'attributeEquals' && (
                             <div>
                               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Attribute Name</label>
                               <input
                                 type="text"
                                 className="w-full text-sm border-gray-200 rounded-md font-mono"
                                 value={test.attribute || ''}
                                 onChange={(e) => updateTest(test.id, { attribute: e.target.value })}
                               />
                             </div>
                           )}
                           {test.type === 'dom' && assertionNeedsExpected(test.assertion || 'exists') && (
                             <div>
                               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Expected Value</label>
                               <input
                                 type="text"
                                 className="w-full text-sm border-gray-200 rounded-md font-mono"
                                 value={test.value ?? ''}
                                 onChange={(e) => updateTest(test.id, { value: e.target.value })}
                               />
                             </div>
                           )}
                           <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Rubric Weight</label>
                             <input
                               type="number"
                               className="w-full text-sm border-gray-200 rounded-md"
                               value={test.weight}
                               onChange={(e) => updateTest(test.id, { weight: e.target.value })}
                             />
                           </div>
                        </div>
                        <button
                          onClick={() => removeTest(test.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors mt-8"
                        >
                          <Trash2 size={18} />
                        </button>
                     </div>
                   ))}

                   <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
                     <div className="flex items-center justify-between gap-3">
                       <div>
                         <h3 className="text-sm font-bold text-gray-900">Interaction Simulation</h3>
                         <p className="text-xs text-gray-500 mt-1">These steps run first, then DOM and computed-style assertions evaluate the resulting state.</p>
                       </div>
                       <button
                         onClick={addInteractionStep}
                         className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                       >
                         <Plus size={14} /> Add Step
                       </button>
                     </div>

                     <div className="mt-4 space-y-3">
                       {interactionSteps.length === 0 ? (
                         <div className="rounded-xl border border-white/80 bg-white px-4 py-3 text-sm text-gray-500">
                           No interaction steps yet. Add hover, click, type, scroll, or keypress steps to test active states and behaviors.
                         </div>
                       ) : interactionSteps.map((step, index) => (
                         <div key={step.id} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                           <div className="flex items-start justify-between gap-4">
                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Step {index + 1} Action</label>
                                 <select
                                   className="w-full text-sm border-gray-200 rounded-md bg-gray-50 focus:bg-white"
                                   value={step.action}
                                   onChange={(e) => updateInteractionStep(step.id, {
                                     action: e.target.value,
                                     selector: actionNeedsSelector(e.target.value) ? step.selector : '',
                                     value: actionNeedsValue(e.target.value) ? step.value : '',
                                     key: actionNeedsKey(e.target.value) ? (step.key || 'Enter') : '',
                                     clear: e.target.value === 'type' ? step.clear : false,
                                     waitForVisible: actionNeedsSelector(e.target.value) ? step.waitForVisible : false
                                   })}
                                 >
                                   {INTERACTION_ACTIONS.map((option) => (
                                     <option key={option.value} value={option.value}>{option.label}</option>
                                   ))}
                                 </select>
                               </div>
                               {actionNeedsSelector(step.action) && (
                                 <div>
                                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Selector</label>
                                   <input
                                     type="text"
                                     className="w-full text-sm border-gray-200 rounded-md font-mono"
                                     value={step.selector || ''}
                                     onChange={(e) => updateInteractionStep(step.id, { selector: e.target.value })}
                                   />
                                 </div>
                               )}
                               {actionNeedsValue(step.action) && (
                                 <div>
                                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">{step.action === 'wait' ? 'Wait (ms)' : 'Value'}</label>
                                   <input
                                     type={step.action === 'wait' ? 'number' : 'text'}
                                     className="w-full text-sm border-gray-200 rounded-md font-mono"
                                     value={step.value ?? ''}
                                     onChange={(e) => updateInteractionStep(step.id, { value: e.target.value })}
                                   />
                                 </div>
                               )}
                               {actionNeedsKey(step.action) && (
                                 <div>
                                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Keyboard Key</label>
                                   <input
                                     type="text"
                                     className="w-full text-sm border-gray-200 rounded-md font-mono"
                                     value={step.key || ''}
                                     onChange={(e) => updateInteractionStep(step.id, { key: e.target.value })}
                                   />
                                 </div>
                               )}
                               <div>
                                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Settle Delay (ms)</label>
                                 <input
                                   type="number"
                                   className="w-full text-sm border-gray-200 rounded-md"
                                   value={step.delay ?? 50}
                                   onChange={(e) => updateInteractionStep(step.id, { delay: e.target.value })}
                                 />
                               </div>
                             </div>
                             <button
                               onClick={() => removeInteractionStep(step.id)}
                               className="text-gray-300 hover:text-red-500 transition-colors"
                             >
                               <Trash2 size={18} />
                             </button>
                           </div>

                           {(actionNeedsSelector(step.action) || step.action === 'type') && (
                             <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                               {actionNeedsSelector(step.action) && (
                                 <label className="inline-flex items-center gap-2">
                                   <input
                                     type="checkbox"
                                     checked={Boolean(step.waitForVisible)}
                                     onChange={(e) => updateInteractionStep(step.id, { waitForVisible: e.target.checked })}
                                   />
                                   Wait for visible
                                 </label>
                               )}
                               {step.action === 'type' && (
                                 <label className="inline-flex items-center gap-2">
                                   <input
                                     type="checkbox"
                                     checked={Boolean(step.clear)}
                                     onChange={(e) => updateInteractionStep(step.id, { clear: e.target.checked })}
                                   />
                                   Clear before typing
                                 </label>
                               )}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   {/* Generated JSON Preview */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowSpecJson((v) => !v)}
                        className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-3"
                      >
                        <span>Generated Spec JSON Output</span>
                        {showSpecJson ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </button>
                      {showSpecJson && (
                        <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-[260px]">
                          <pre className="text-xs text-emerald-300 font-mono">
 {JSON.stringify(specJson, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
           {/* Metric Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Avg. Score</span>
                <span className="text-4xl font-black text-emerald-600">{analyticsData.avgScore}<span className="text-xl text-emerald-300 ml-1">%</span></span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Pass Rate</span>
                <span className="text-4xl font-black text-emerald-500">{analyticsData.passRate}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Submissions</span>
                <span className="text-4xl font-black text-gray-800">{analyticsData.totalSubmissions}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Avg Performance</span>
                <span className="text-4xl font-black text-emerald-600">{analyticsData.avgExecution}</span>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Score Distribution Chart */}
             <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">Cohort Score Distribution</h3>
                <div className="h-[300px] flex items-center justify-center">
                  <Bar 
                    data={{
                      labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
                      datasets: [{
                        label: 'Students',
                        data: analyticsData.scoreHistogram,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        borderSkipped: false,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { dash: [4,4] } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
             </div>

             {/* Diagnostics List */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users size={18} className="text-emerald-600"/> Common Stumbling Blocks
                </h3>
                <div className="flex-1 overflow-y-auto pr-2">
                  <ul className="space-y-3">
                    {analyticsData.failedTests.map((item, idx) => (
                      <li key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-red-600 bg-red-50/50 px-2 py-1 rounded border border-red-100 tracking-tight truncate flex-1">
                          {item.test}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold text-gray-700">{item.count}</span>
                          <span className="text-xs text-gray-400">fails</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
             </div>

           </div>
        </div>
      )}
    </div>
  );
}

