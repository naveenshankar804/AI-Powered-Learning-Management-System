import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, RefreshCw } from 'lucide-react';
import ScoreGauge from '../components/results/ScoreGauge';
import AIFeedbackCard from '../components/results/AIFeedbackCard';
import FailedTestsTable from '../components/results/FailedTestsTable';
import DiffViewer from '../components/results/DiffViewer';

export default function EvaluationResults() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressStage, setProgressStage] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replayBusy, setReplayBusy] = useState(false);
  const [userId] = useState(() => window.localStorage.getItem('amypo_user_id') || '1');
  const [selectedViewport, setSelectedViewport] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(String(userId))}`);
        const data = await res.json();
        if (!cancelled) setIsAdmin(String(data?.role || '').toLowerCase() === 'admin');
      } catch (_) {
        if (!cancelled) setIsAdmin(false);
      }
    };
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let intervalId = null;
    let eventSource = null;
    let stopped = false;

    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (eventSource) eventSource.close();
      eventSource = null;
      stopped = true;
    };

    const fetchResult = async () => {
      try {
        if (id === 'demo-123') {
          // Keep mock for the specific demo route
          setResult({
            status: 'completed',
            submission_id: 'demo-123',
            total_score: 78.5,
            scores: { html: 18, css: 25.5, js: 35, visual: 0 },
            mismatchPercent: 8.45,
            visualArtifacts: {
              expected: '/mocks/expected.svg',
              actual: '/mocks/actual.svg',
              diff: '/mocks/diff.svg',
              boxes: []
            },
            failedTests: [
              { testId: 'css_flexbox_missing', hint: 'The .card container needs display:flex to align children side-by-side.', selector: '.card' },
              { testId: 'css_button_hover', hint: 'Button background on hover does not match specified color #312e81.', selector: 'button:hover' }
            ],
            aiFeedback: {
              summary: "Your JavaScript logic is perfect and HTML structure is mostly correct. However, your CSS layout completely missed the flexbox requirement, causing a large visual diff deviation.",
              suggestions: ["Add 'display: flex' and 'align-items: center' to your main .card class.", "Ensure the button hover transition matches exactly 0.2s duration.", "Your image border radius is slightly off (expected 50%, actual 8px)."],
              difficulty_estimate: "Easy",
              high_diff_cause: "Flexbox layout completely missing on parent container."
            }
          });
          setLoading(false);
          return;
        }

        const qs = activeRunId ? `?run_id=${encodeURIComponent(String(activeRunId))}` : '';
        const res = await fetch(`/api/submissions/${id}/result${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch evaluation result');

        setResult(data);
        setError(null);

        if (data.status === 'completed' || data.status === 'failed') {
          stop();
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Poll every 2 seconds until the run completes/fails
    fetchResult();
    intervalId = setInterval(() => {
      if (!stopped) fetchResult();
    }, 2000);

    // Optional: stream progress stages while polling for final artifacts.
    if (id !== 'demo-123') {
      try {
        eventSource = new EventSource(`/api/submissions/${id}/progress`);
        eventSource.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg?.progress?.stage) setProgressStage(msg.progress.stage);
          } catch (_) {}
        };
        eventSource.onerror = () => {
          // If SSE fails (proxy/CORS), polling still works.
          if (eventSource) eventSource.close();
          eventSource = null;
        };
      } catch (_) {}
    }

    return () => stop();
  }, [id, activeRunId]);

  const replayEvaluation = async () => {
    if (!id || id === 'demo-123') return;
    setReplayBusy(true);
    setError(null);
    setLoading(true);
    setResult(null);
    setProgressStage('Packaging submission');

    try {
      const res = await fetch(`/api/submissions/${id}/replay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId),
          'x-user-role': 'admin'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to replay evaluation');
      setActiveRunId(data.run_id || null);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    } finally {
      setReplayBusy(false);
    }
  };

  const scores = result?.scores || { html: 0, css: 0, js: 0, visual: 0 };
  const rubric = result?.rubric || { html: 20, css: 35, js: 35, visual: 10, a11y: 0, quality: 0 };
  const totalScore =
    result?.total_score ?? (scores.html + scores.css + scores.js + scores.visual);
  const visual = result?.visualArtifacts || null;
  const mismatchPercent = Number(result?.mismatchPercentage ?? result?.mismatchPercent ?? 0);
  const failedTests = result?.failedTests || [];
  const aiFeedback = result?.aiFeedback || { summary: "No AI feedback generated.", suggestions: [] };

  const visualTests = Array.isArray(result?.visualTests) ? result.visualTests : [];
  const viewportsToRender = visualTests.length > 0
    ? visualTests
    : (visual
        ? [{
            viewport: 'desktop',
            expected: visual.expected || '',
            actual: visual.actual || '',
            diff: visual.diff || '',
            diffPercent: mismatchPercent,
            boxes: visual.boxes || []
          }]
        : []);

  useEffect(() => {
    if (viewportsToRender.length === 0) {
      if (selectedViewport) setSelectedViewport('');
      return;
    }

    const hasCurrent = viewportsToRender.some((vt) => String(vt?.viewport || '') === selectedViewport);
    if (hasCurrent) return;

    const preferredViewport = viewportsToRender.find((vt) => String(vt?.viewport || '').toLowerCase() === 'desktop')?.viewport
      || viewportsToRender[0]?.viewport
      || '';

    setSelectedViewport(String(preferredViewport));
  }, [viewportsToRender, selectedViewport]);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  if (error || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Evaluation Error</h2>
        <p className="text-gray-500">{error || "Could not load evaluation report."}</p>
        <Link to="/student" className="px-6 py-2 bg-emerald-600 text-white rounded-lg">Return to Workspace</Link>
      </div>
    );
  }

  const activeVisualTest = viewportsToRender.find((vt) => String(vt?.viewport || '') === selectedViewport) || viewportsToRender[0] || null;

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/student" className="text-gray-400 hover:text-emerald-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Evaluation Report</h1>
          </div>
          <p className="text-sm text-gray-500 font-mono ml-7">ID: {result.submission_id}</p>
          {(result.status === 'running' || result.status === 'pending') && (
            <p className="text-xs text-gray-500 ml-7 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              {progressStage ? `Stage: ${progressStage}` : 'Evaluating...'}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto ml-7 sm:ml-0">
          <button
            onClick={() => {
              const runId = result?.run_id;
              if (!id || !runId) return;
              const url = `/api/submissions/${encodeURIComponent(String(id))}/artifacts/report.pdf?run_id=${encodeURIComponent(String(runId))}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold transition-colors flex"
            title="Open evaluation PDF report"
          >
            <Download size={16} /> Export PDF
          </button>
          {isAdmin && id && id !== 'demo-123' && (
            <button
              onClick={replayEvaluation}
              disabled={replayBusy}
              className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex"
              title="Replay evaluation for this submission"
            >
              <RefreshCw size={16} className={replayBusy ? 'animate-spin' : ''} /> Replay Evaluation
            </button>
          )}
          <Link to="/student" className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-600/20 flex">
            Next Challenge <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Scores & AI */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main Score Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest w-full text-center mb-6 border-b border-gray-50 pb-4">Overall Grade</h3>
             <ScoreGauge score={totalScore} size="lg" />
             
              {/* Sub-scores */}
              <div className="w-full mt-8 space-y-4">
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>HTML</span> <span>{scores.html}/{rubric.html}</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rubric.html > 0 ? Math.min(100, (scores.html / rubric.html) * 100) : 0}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>CSS</span> <span>{scores.css}/{rubric.css}</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500 rounded-full" style={{ width: `${rubric.css > 0 ? Math.min(100, (scores.css / rubric.css) * 100) : 0}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>JavaScript</span> <span>{scores.js}/{rubric.js}</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${rubric.js > 0 ? Math.min(100, (scores.js / rubric.js) * 100) : 0}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>Visual Match</span> <span>{scores.visual}/{rubric.visual}</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rubric.visual > 0 ? Math.min(100, (scores.visual / rubric.visual) * 100) : 0}%` }}></div>
                   </div>
                 </div>
              </div>
          </div>

          <AIFeedbackCard feedback={aiFeedback} />
          
        </div>

        {/* Right Column: Diff & Tests */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           
           {viewportsToRender.length === 0 ? (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
               Evaluation artifacts not generated yet.
             </div>
           ) : (
             <div className="flex flex-col gap-3">
               <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                 <div className="text-xs font-black uppercase tracking-widest text-gray-400">
                   Viewport: <span className="text-gray-700">{activeVisualTest?.viewport || 'default'}</span>
                 </div>

                 {viewportsToRender.length > 1 && (
                   <div className="flex flex-wrap items-center gap-2">
                     {viewportsToRender.map((vt) => {
                       const isActive = String(vt?.viewport || '') === String(activeVisualTest?.viewport || '');
                       return (
                         <button
                           key={`viewport-${vt?.viewport || 'default'}`}
                           type="button"
                           onClick={() => setSelectedViewport(String(vt?.viewport || 'default'))}
                           className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                             isActive
                               ? 'bg-emerald-600 text-white shadow-sm'
                               : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                           }`}
                         >
                           {vt?.viewport || 'default'}
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>

               <DiffViewer
                 key={`submission-${result?.submission_id || id}-run-${result?.run_id || 'latest'}-viewport-${activeVisualTest?.viewport || 'default'}`}
                 expectedUrl={activeVisualTest?.expected || ''}
                 actualUrl={activeVisualTest?.actual || ''}
                 diffUrl={activeVisualTest?.diff || ''}
                 expectedRenderUrl={activeVisualTest?.expectedRenderUrl || ''}
                 actualRenderUrl={activeVisualTest?.actualRenderUrl || ''}
                 mismatchPercentage={Number(activeVisualTest?.diffPercent ?? activeVisualTest?.diffPercentage ?? mismatchPercent ?? 0)}
                 boxes={Array.isArray(activeVisualTest?.boxes || activeVisualTest?.hotspots) ? (activeVisualTest?.boxes || activeVisualTest?.hotspots) : []}
                 comparisonWidth={Number(activeVisualTest?.comparisonWidth ?? 0)}
                 comparisonHeight={Number(activeVisualTest?.comparisonHeight ?? 0)}
                 viewportWidth={Number(activeVisualTest?.viewportWidth ?? 0)}
                 viewportHeight={Number(activeVisualTest?.viewportHeight ?? 0)}
               />
             </div>
           )}

           <FailedTestsTable failedTests={failedTests} />

         </div>

       </div>

    </div>
  );
}

