import React from 'react';
import { XCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export default function FailedTestsTable({ failedTests = [] }) {
  if (failedTests.length === 0) {
    return (
      <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-8 text-center flex flex-col items-center justify-center">
         <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
           <CheckCircle2 size={24} />
         </div>
         <h4 className="text-lg font-bold text-emerald-900 mb-1">All Assertions Passed!</h4>
         <p className="text-emerald-700 text-sm">Excellent work. Your code passed all structural and stylistic baseline checks.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
        <h3 className="font-bold text-gray-900">Failed Assertions ({failedTests.length})</h3>
        <p className="text-sm text-gray-500">Review the specific DOM and CSS checks that your submission did not meet.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Test ID / Type</th>
              <th className="px-5 py-3 font-semibold">Target Element</th>
              <th className="px-5 py-3 font-semibold">Diagnostic Hint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {failedTests.map((test, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4 w-12 text-center">
                  <XCircle size={20} className="text-red-500 mx-auto" strokeWidth={2.5} />
                </td>
                <td className="px-5 py-4">
                  <div className="font-mono text-xs text-gray-900 font-bold bg-gray-100 inline-block px-2 py-1 rounded">
                    {test.testId}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <code className="text-sm text-emerald-600 font-medium">
                    {test.selector || 'N/A'}
                  </code>
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                     <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />
                     <span>{test.hint || test.error || 'Check element properties.'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

