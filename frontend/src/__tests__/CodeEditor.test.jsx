import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CodeEditor from '../components/workspace/CodeEditor';

// Mock the Monaco editor
vi.mock('@monaco-editor/react', () => {
  return {
    default: ({ value, language, onMount, onChange, options }) => {
      // Simulate onMount to get coverage on the theme setup
      if (onMount) {
        const monacoMock = {
          editor: {
            defineTheme: vi.fn(),
            setTheme: vi.fn()
          },
          KeyMod: { CtrlCmd: 1, Shift: 2 },
          KeyCode: { KeyF: 3 }
        };
        const editorMock = {
          addCommand: vi.fn((key, callback) => {
             // Mock addCommand so we can theoretically cover it
          }),
          getAction: vi.fn().mockReturnValue({ run: vi.fn() })
        };
        onMount(editorMock, monacoMock);
      }
      return (
        <textarea
          data-testid="monaco-editor-mock"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={options?.readOnly}
          data-language={language}
        />
      );
    }
  };
});

describe('CodeEditor', () => {
  it('renders the editor with default props', () => {
    render(<CodeEditor language="javascript" value="console.log('test')" onChange={vi.fn()} />);
    const editor = screen.getByTestId('monaco-editor-mock');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue("console.log('test')");
    expect(editor).toHaveAttribute('data-language', 'javascript');
  });

  it('renders the editor in readOnly mode', () => {
    render(<CodeEditor language="html" value="<div></div>" onChange={vi.fn()} readOnly={true} />);
    const editor = screen.getByTestId('monaco-editor-mock');
    expect(editor).toHaveAttribute('readonly');
  });
});
