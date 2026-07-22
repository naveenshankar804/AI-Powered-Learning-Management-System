import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SaveAll, Layout, Code2, ShieldAlert, Cpu, Plus, Trash2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/ui/use-toast';

const TABS = [
  { id: 'general', label: 'General', icon: Layout },
  { icon: Code2, id: 'code', label: 'Starter Code' },
  { icon: ShieldAlert, id: 'constraints', label: 'Constraints' },
  { icon: Cpu, id: 'tests', label: 'Test Specs' }
];

const DEFAULT_FILES = {
  html: "<div class='card'>\n  <!-- Start styling here -->\n</div>",
  css: '',
  js: ''
};

export default function QuestionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const questionId = id ? Number(id) : null;
  const isEdit = Number.isFinite(questionId) && questionId > 0;

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(!!isEdit);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lastSavedAtRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowedLibraries, setAllowedLibraries] = useState([]);
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [constraints, setConstraints] = useState([]);
  const [specJsonText, setSpecJsonText] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isEdit) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/questions/${questionId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load question');
        if (cancelled) return;

        const q = data.question || {};
        setTitle(q.title || '');
        setDescription(q.description || '');
        setAllowedLibraries(Array.isArray(q.allowed_libraries) ? q.allowed_libraries : []);
        setConstraints(Array.isArray(q.constraints) ? q.constraints : []);

        const byType = new Map((Array.isArray(data.files) ? data.files : []).map((f) => [f.type, f]));
        setFiles({
          html: byType.get('html')?.content ?? DEFAULT_FILES.html,
          css: byType.get('css')?.content ?? DEFAULT_FILES.css,
          js: byType.get('js')?.content ?? DEFAULT_FILES.js
        });

        setSpecJsonText(JSON.stringify(data.testSpec || {}, null, 2));
        setDirty(false);
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load question.', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isEdit, questionId, toast]);

  const canSave = useMemo(() => {
    return !saving && title.trim().length > 0;
  }, [saving, title]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let spec_json = null;
      const raw = specJsonText.trim();
      if (raw) {
        try {
          spec_json = JSON.parse(raw);
        } catch (e) {
          throw new Error('Test Specs must be valid JSON.');
        }
      }

      const payload = {
        title: title.trim(),
        description,
        allowed_libraries: allowedLibraries,
        constraints,
        files,
        spec_json
      };

      if (isEdit) {
        const res = await fetch(`/api/questions/${questionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Save failed');
        if (data?.baseline?.queued) {
          toast({
            title: 'Baseline Queued',
            description: `Visual artifacts for this question were queued automatically as baseline v${data.baseline.version}.`
          });
        }
      } else {
        const res = await fetch(`/api/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Create failed');
        const newId = data?.question?.id;
        toast({
          title: data?.baseline?.queued ? 'Created & Queued' : 'Created',
          description: data?.baseline?.queued
            ? `Question ${newId} created. Baseline v${data.baseline.version} is generating now.`
            : `Question ${newId} created.`
        });
        navigate(`/teacher/editor/${newId}`);
      }

      lastSavedAtRef.current = new Date();
      setDirty(false);
      toast({ title: 'Saved', description: 'Your changes have been saved.' });
    } catch (e) {
      toast({ title: 'Save Failed', description: e?.message || 'Could not save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Lightweight autosave for edits only.
  useEffect(() => {
    if (!isEdit) return;
    if (!dirty) return;
    const t = setTimeout(() => {
      save();
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, isEdit]);

  const addConstraint = () => {
    setConstraints((prev) => [...prev, { type: 'css', property: '', value: '', selector: '' }]);
    setDirty(true);
  };

  const removeConstraint = (idx) => {
    setConstraints((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const updateConstraint = (idx, patch) => {
    setConstraints((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    setDirty(true);
  };

  const addLibrary = () => {
    const url = prompt('Enter a CDN URL to allow for this question:');
    if (!url) return;
    setAllowedLibraries((prev) => [...prev, url]);
    setDirty(true);
  };

  const removeLibrary = (idx) => {
    setAllowedLibraries((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const setFile = (key, value) => {
    setFiles((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-6">
        <div className="h-10 w-56 bg-gray-100 rounded-xl animate-pulse" />
        <div className="mt-6 h-[520px] bg-gray-100 rounded-[2.5rem] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Question Editor</h1>
          <p className="text-gray-500 font-medium">Create and maintain frontend challenges</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'} ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : dirty ? 'Unsaved changes' : 'Saved'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/teacher')}
              className="px-5 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 text-sm"
            >
              <SaveAll size={18} /> Save Challenge
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="w-64 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-600 shadow-sm border border-gray-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-8 min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Challenge Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                    placeholder="e.g. Build a Product Grid with Grid Layout"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-50 focus:border-emerald-100 outline-none transition-all placeholder:text-gray-300 font-medium text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Detailed Briefing</label>
                  <textarea
                    rows={8}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
                    placeholder="Describe the objective, expected behavior, and specific requirements..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-50 focus:border-emerald-100 outline-none transition-all placeholder:text-gray-300 font-medium leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Settings2 size={18} className="text-emerald-600" /> Allowed Libraries
                  </div>
                  <button onClick={addLibrary} className="text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                    <Plus size={18} /> Add Library
                  </button>
                </div>
                <div className="space-y-2">
                  {allowedLibraries.map((l, idx) => (
                    <div key={`${l}-${idx}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="font-mono text-xs text-gray-700 truncate">{l}</div>
                      <button onClick={() => removeLibrary(idx)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" aria-label="Remove library">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {allowedLibraries.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 font-medium">
                      No libraries allowed. (Default: fully offline sandbox)
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">index.html</label>
                    <textarea
                      value={files.html}
                      onChange={(e) => setFile('html', e.target.value)}
                      className="w-full h-60 rounded-2xl bg-gray-900 text-emerald-300 p-4 font-mono text-xs shadow-inner outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">styles.css</label>
                    <textarea
                      value={files.css}
                      onChange={(e) => setFile('css', e.target.value)}
                      className="w-full h-60 rounded-2xl bg-gray-900 text-sky-300 p-4 font-mono text-xs shadow-inner outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">script.js</label>
                    <textarea
                      value={files.js}
                      onChange={(e) => setFile('js', e.target.value)}
                      className="w-full h-60 rounded-2xl bg-gray-900 text-amber-200 p-4 font-mono text-xs shadow-inner outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'constraints' && (
              <motion.div
                key="constraints"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Architectural Constraints</h3>
                  <button onClick={addConstraint} className="text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                    <Plus size={18} /> Add Condition
                  </button>
                </div>

                <div className="space-y-4">
                  {constraints.map((c, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4">
                      <select
                        value={c.type || 'css'}
                        onChange={(e) => updateConstraint(idx, { type: e.target.value })}
                        className="bg-transparent font-bold text-sm outline-none"
                      >
                        <option value="css">CSS</option>
                        <option value="html">HTML</option>
                        <option value="js">JS</option>
                      </select>
                      <input
                        value={c.selector || ''}
                        onChange={(e) => updateConstraint(idx, { selector: e.target.value })}
                        type="text"
                        placeholder="Selector (.card)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <input
                        value={c.property || ''}
                        onChange={(e) => updateConstraint(idx, { property: e.target.value })}
                        type="text"
                        placeholder="Property (display)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <input
                        value={c.value || ''}
                        onChange={(e) => updateConstraint(idx, { value: e.target.value })}
                        type="text"
                        placeholder="Value (flex)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <button onClick={() => removeConstraint(idx)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {constraints.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 font-medium">
                      No constraints defined.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'tests' && (
              <motion.div
                key="tests"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="text-sm text-gray-600">
                  Paste or edit the TestSpec JSON for this question. (You can also use the Teacher Tools Spec Builder tab.)
                </div>
                <textarea
                  value={specJsonText}
                  onChange={(e) => { setSpecJsonText(e.target.value); setDirty(true); }}
                  className="w-full h-[420px] rounded-2xl bg-gray-900 text-emerald-200 p-4 font-mono text-xs shadow-inner outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}


