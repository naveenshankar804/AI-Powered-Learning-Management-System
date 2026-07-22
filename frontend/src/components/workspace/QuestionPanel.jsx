import React from 'react';
import DOMPurify from 'dompurify';

export default function QuestionPanel({ question }) {
  if (!question) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Loading question...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white overflow-y-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-md shadow-sm">
          {question.difficulty || 'Easy'}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{question.title}</h1>
      </div>
      
      <div className="prose prose-indigo max-w-none prose-sm sm:prose-base text-gray-700">
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.description) }} />
      </div>

      {question.requirements && question.requirements.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Technical Requirements</h3>
          <ul className="space-y-3">
            {question.requirements.map((req, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-gray-700">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

