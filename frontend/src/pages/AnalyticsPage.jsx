import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';

const API_BASE = '/api';

async function readJsonSafely(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error(res.ok ? 'Invalid server response' : text || 'Server error');
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Demo app uses Question 1 everywhere today.
  const questionId = 1;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/trainer/analytics/questions/${questionId}`);
        const json = await readJsonSafely(res);
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-emerald-600" /> Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cohort-level insights for Question {questionId}.</p>
        </div>
      </div>

      {loading && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-gray-600 text-sm">
          Loading analytics…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Score</div>
              <div className="mt-2 text-3xl font-black text-emerald-600">{data.avgScore ?? 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Exec (ms)</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{data.avgExecutionTimeMs ?? 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visual Diff Dist</div>
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                {Object.entries(data.visualDiffDist || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900">Score Histogram</h2>
            <div className="mt-4 grid grid-cols-5 gap-2 items-end h-28">
              {(data.scoreHistogram || [0, 0, 0, 0, 0]).map((v, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-lg bg-emerald-200"
                    style={{ height: `${Math.max(8, Math.min(100, v * 2))}%` }}
                    title={String(v)}
                  />
                  <span className="text-[10px] text-gray-500">{['0-20', '21-40', '41-60', '61-80', '81-100'][idx]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900">Common Failed Tests</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(data.failedTestsFrequency || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="font-mono text-xs text-gray-700 truncate">{k}</span>
                    <span className="text-sm font-bold text-gray-900">{v}</span>
                  </div>
                ))}
              {(!data.failedTestsFrequency || Object.keys(data.failedTestsFrequency).length === 0) && (
                <div className="text-sm text-gray-500">No failed test frequency data yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


