import React from 'react';
import { Bot, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AIFeedbackCard({ feedback }) {
  if (!feedback) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -transtale-y-1/2 translate-x-1/3 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen opacity-20 filter blur-3xl"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-48 h-48 bg-emerald-500 rounded-full mix-blend-screen opacity-20 filter blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
           <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Bot size={20} className="text-emerald-300" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-white tracking-tight">AI Diagnostic Insights</h3>
             <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Powered by Gemini</p>
           </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm">
           <p className="text-sm text-emerald-100 leading-relaxed font-medium">
             "{feedback.summary}"
           </p>
        </div>

        {feedback.suggestions && feedback.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
               <Lightbulb size={14} /> Actionable Suggestions
            </h4>
            <ul className="space-y-2">
              {feedback.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-emerald-50 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10">
           <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <TrendingUp size={14} /> Estimated Difficulty: <span className="text-white capitalize px-2 py-0.5 bg-white/10 rounded-md">{feedback.difficulty_estimate || 'Medium'}</span>
           </div>
           {feedback.high_diff_cause && (
             <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
               <AlertTriangle size={14} /> {feedback.high_diff_cause}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

