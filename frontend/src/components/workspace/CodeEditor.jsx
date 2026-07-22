import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ language, value, onChange, readOnly = false }) {
  const handleEditorDidMount = (editor, monaco) => {
    // Custom theme for the editor to match our SaaS palette
    monaco.editor.defineTheme('saasDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '0f172a' }
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.lineHighlightBackground': '#1e293b',
      }
    });
    monaco.editor.setTheme('saasDark');
    
    // Add quick formatting shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
    });
  };

  return (
    <div className="w-full h-full rounded-b-xl overflow-hidden border-t border-slate-800">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={onChange}
        theme="vs-dark" // Fallback, onMount will set our custom 'saasDark' theme
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          wordWrap: 'on',
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          readOnly: readOnly,
          formatOnPaste: true,
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-slate-900 text-slate-400">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        }
      />
    </div>
  );
}

