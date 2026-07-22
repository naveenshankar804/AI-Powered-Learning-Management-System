import React, { useEffect, useRef } from 'react';
import { buildPreviewDocument } from './previewDocument';

export default function PreviewFrame({ html, css, js }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const content = buildPreviewDocument({ html, css, js });

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    iframeRef.current.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html, css, js]);

  return (
    <div className="w-full h-full bg-white rounded-b-xl overflow-hidden border-t border-gray-100 flex flex-col relative">
      <div className="flex bg-gray-50 border-b border-gray-200 px-3 py-1.5 items-center justify-between text-xs text-gray-500 font-mono select-none shadow-sm z-10">
        <div className="flex gap-1.5 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
        </div>
        <span>Browser Preview</span>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-modals"
        title="Live Preview"
        className="flex-1 w-full bg-white"
        frameBorder="0"
      />
    </div>
  );
}
