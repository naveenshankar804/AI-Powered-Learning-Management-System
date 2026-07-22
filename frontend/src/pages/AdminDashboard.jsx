import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Trash2, Plus, ShieldCheck, PlayCircle, X, Terminal, Globe, ServerCrash } from 'lucide-react';
import { cn } from '../utils/utils';

const API_BASE = '/api/admin';

export default function AdminDashboard() {
  const [whitelist, setWhitelist] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [logs, setLogs] = useState([]);
  
  // Replay Modal State
  const [replayModalOpen, setReplayModalOpen] = useState(false);
  const [activeReplayId, setActiveReplayId] = useState(null);
  const [replayEvents, setReplayEvents] = useState([]);

  async function fetchWhitelist() {
    try { const res = await axios.get(`${API_BASE}/whitelist`); setWhitelist(res.data); } catch (e) { console.error(e); }
  }

  async function fetchLogs() {
    try { const res = await axios.get(`${API_BASE}/logs`); setLogs(res.data); } catch (e) { console.error(e); }
  }

  useEffect(() => {
    fetchWhitelist();
    fetchLogs();
  }, []);

  useEffect(() => {
    let eventSource;
    if (replayModalOpen && activeReplayId) {
      eventSource = new EventSource(`/api/submissions/${activeReplayId}/progress`);
      
      eventSource.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        // Backend progress stream currently emits either:
        // - { progress: { stage: "..." } }
        // - { status: "completed" }
        // - { status: "failed", error: "..." }
        if (msg?.progress?.stage) {
          setReplayEvents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'info', text: `Stage: ${msg.progress.stage}` }]);
        } else if (msg?.status === 'completed') {
          setReplayEvents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'success', text: `Completed.` }]);
          eventSource.close();
        } else if (msg?.status === 'failed') {
          setReplayEvents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'error', text: `FAILED: ${msg.error || 'Unknown error'}` }]);
          eventSource.close();
        }
      };
      
      eventSource.onerror = () => {
        setReplayEvents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'warning', text: `Connection error or stream closed.` }]);
        eventSource.close();
      };
    }
    
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [replayModalOpen, activeReplayId]);

  const addDomain = async () => {
    if (!newDomain) return;
    try {
      await axios.post(`${API_BASE}/whitelist`, { domain: newDomain });
      setNewDomain('');
      fetchWhitelist();
    } catch (e) { console.error(e); }
  };

  const removeDomain = async (id) => {
    try {
      await axios.delete(`${API_BASE}/whitelist/${id}`);
      fetchWhitelist();
    } catch (e) { console.error(e); }
  };

  const replayEval = async (id) => {
    try {
      const res = await axios.post(`${API_BASE}/evaluation_runs/${id}/replay`);
      const submissionId = res.data.submission_id;
      setActiveReplayId(submissionId);
      setReplayEvents([{ time: new Date().toLocaleTimeString(), type: 'system', text: `Queued replay for Submission ID: ${submissionId}` }]);
      setReplayModalOpen(true);
    } catch (e) { 
      console.error(e);
      alert('Failed to trigger replay. Connection to API missing.');
    }
  }

  const closeReplayModal = () => {
    setReplayModalOpen(false);
    setActiveReplayId(null);
    setReplayEvents([]);
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> System Access & Ops</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global library whitelists and actively monitor evaluation workers.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Whitelist Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Globe className="text-emerald-600" size={18} />
            <h2 className="font-bold text-gray-900">Library Whitelist Policy</h2>
          </div>
          <div className="p-6">
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="e.g., cdn.jsdelivr.net" 
                className="flex-1 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm font-mono"
                value={newDomain} onChange={e => setNewDomain(e.target.value)}
              />
              <button 
                onClick={addDomain} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus size={16}/> Add
              </button>
            </div>
            
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <ul className="divide-y divide-gray-100">
                {whitelist.map(w => (
                  <li key={w.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={14} />
                      </div>
                      <span className="font-mono text-sm text-gray-700 font-medium">{w.domain}</span>
                    </div>
                    <button 
                      onClick={() => removeDomain(w.id)} 
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </li>
                ))}
                {whitelist.length === 0 && (
                  <li className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                    <ServerCrash className="text-gray-300" size={32} />
                    <p className="font-medium text-gray-900">Zero Trust Enforced</p>
                    <p className="text-sm">No domains allowed. All external sandbox requests blocked.</p>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Evaluation Logs Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Terminal className="text-emerald-600" size={18} />
               <h2 className="font-bold text-gray-900">Worker Evaluation Logs</h2>
            </div>
            <button onClick={fetchLogs} className="text-gray-400 hover:text-emerald-600 transition-colors bg-white border border-gray-200 p-1.5 rounded-md shadow-sm">
              <RefreshCw size={14}/>
            </button>
          </div>
          
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {logs.length > 0 ? (
               <div className="space-y-3">
                 {logs.map(log => (
                   <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-emerald-300 transition-colors">
                     <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-1">Run Assignment</p>
                         <p className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm inline-block">{String(log.id).slice(0, 8)}</p>
                       </div>
                       <button onClick={() => replayEval(log.id)} className="bg-slate-900 text-white hover:bg-emerald-600 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 opacity-0 group-hover:opacity-100">
                         <PlayCircle size={14} /> Replay Task
                       </button>
                     </div>
                     <div className="flex gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">HTML: {log.html_score}</span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">CSS: {log.css_score}</span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">JS: {log.js_score}</span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700">VIS: {Number(log.visual_score ?? 0).toFixed(1)}</span>
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                 <Terminal className="text-gray-300" size={32} />
                 <p className="font-medium text-gray-900">Worker Pool Idle</p>
                 <p className="text-sm">No historical evaluation logs found in the database.</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Replay Terminal Modal */}
      {replayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-[700px] max-w-full overflow-hidden border border-slate-700 transform transition-all flex flex-col">
            
            {/* Terminal Top Bar */}
            <div className="bg-[#1e293b] flex items-center justify-between px-4 py-3 border-b border-slate-700">
               <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={closeReplayModal}></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-slate-400 font-mono text-xs flex items-center gap-2">
                    <Terminal size={14} /> worker-pool/live-eval
                  </span>
               </div>
               <button onClick={closeReplayModal} className="text-slate-400 hover:text-white transition-colors">
                 <X size={18} />
               </button>
            </div>
            
            {/* Terminal Body */}
            <div className="p-5 h-[400px] overflow-y-auto font-mono text-sm space-y-2 relative no-scrollbar">
               {/* Scanline effect */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 pointer-events-none opacity-20"></div>
               
               {replayEvents.map((evt, idx) => (
                 <div key={idx} className="flex gap-3">
                   <span className="text-slate-500 shrink-0">{evt.time}</span>
                   <span className={cn(
                     evt.type === 'system' ? 'text-blue-400 font-bold' :
                     evt.type === 'info' ? 'text-slate-300' :
                     evt.type === 'success' ? 'text-emerald-400 font-bold' :
                     evt.type === 'warning' ? 'text-amber-400' :
                     'text-red-400 font-bold'
                   )}>
                     {evt.text}
                   </span>
                 </div>
               ))}
               
               {replayEvents.length > 0 && replayEvents[replayEvents.length - 1].type !== 'success' && replayEvents[replayEvents.length - 1].type !== 'error' && (
                 <div className="flex gap-3 animate-pulse">
                   <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
                   <span className="text-emerald-400">_</span>
                 </div>
               )}
            </div>
            
            <div className="bg-[#1e293b] px-4 py-2 border-t border-slate-700 text-xs font-mono text-slate-500 flex justify-between">
               <span>Status: {activeReplayId ? 'CONNECTED' : 'DISCONNECTED'}</span>
               <span>TARGET: {activeReplayId || 'NONE'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

