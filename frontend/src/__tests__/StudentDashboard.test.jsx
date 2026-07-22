import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from '../pages/StudentDashboard';
import { BrowserRouter } from 'react-router-dom';
import * as router from 'react-router-dom';
import * as useToastModule from '../components/ui/use-toast';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('StudentDashboard', () => {
  let navigateMock;
  let toastMock;
  let originalEventSource;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    toastMock = vi.fn();
    vi.spyOn(useToastModule, 'useToast').mockReturnValue({ toast: toastMock });

    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question' }] })
        });
      }
      if (url === '/api/questions/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { title: 'Test Question', description: 'Test Description' },
            testSpec: { difficulty: 'Easy' },
            files: [
              { type: 'html', content: '<div></div>' },
              { type: 'css', content: 'div { color: red; }' },
              { type: 'js', content: 'console.log("test");' }
            ]
          })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    navigateMock = vi.fn();
    vi.spyOn(router, 'useNavigate').mockImplementation(() => navigateMock);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/1234');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.EventSource = originalEventSource;
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <StudentDashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches questions', async () => {
    renderComponent();

    const headers = screen.getAllByText('Practice Workspace');
    expect(headers.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1');
    });

    const questionTexts = await screen.findAllByText('Test Question');
    expect(questionTexts.length).toBeGreaterThan(0);
  });

  it('handles code reset', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1');
    });

    const resetButton = await screen.findByRole('button', { name: /Reset Code/i });
    await user.click(resetButton);

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Code Reset",
      description: "Your code has been reset to the starter template."
    }));
  });

  it('handles evaluation submission and successful SSE completion', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });

    global.fetch.mockImplementation((url) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question' }] })
        });
      }
      if (url === '/api/questions/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { title: 'Test Question', description: 'Test Description' },
            testSpec: { difficulty: 'Easy' },
            files: [
              { type: 'html', content: '<div></div>' },
              { type: 'css', content: 'div { color: red; }' },
              { type: 'js', content: 'console.log("test");' }
            ]
          })
        });
      }
      if (url === '/api/submissions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submission_id: 'sub-123', run_id: 'run-123' })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    let sseCallback;
    class MockEventSource {
      constructor(url) {
        this.url = url;
      }
      close() {}
      set onmessage(cb) {
        sseCallback = cb;
      }
      set onerror(cb) {}
    }
    global.EventSource = MockEventSource;

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1');
    });

    const submitBtn = screen.getByRole('button', { name: /Submit & Evaluate/i });
    await user.click(submitBtn);

    expect(screen.getByText('Evaluation Pipeline')).toBeInTheDocument();

    await act(async () => {
      if (sseCallback) {
        sseCallback({ data: JSON.stringify({ status: 'completed' }) });
      }
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(navigateMock).toHaveBeenCalledWith('/results/sub-123');
  });

  it('handles evaluation submission failure via SSE', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });

    global.fetch.mockImplementation((url) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question' }] })
        });
      }
      if (url === '/api/questions/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { title: 'Test Question', description: 'Test Description' },
            testSpec: { difficulty: 'Easy' },
            files: [
              { type: 'html', content: '<div></div>' },
              { type: 'css', content: 'div { color: red; }' },
              { type: 'js', content: 'console.log("test");' }
            ]
          })
        });
      }
      if (url === '/api/submissions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submission_id: 'sub-123', run_id: 'run-123' })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    let sseErrorCallback;
    class MockEventSourceError {
      constructor(url) {
        this.url = url;
      }
      close() {}
      set onmessage(cb) {}
      set onerror(cb) {
        sseErrorCallback = cb;
      }
    }
    global.EventSource = MockEventSourceError;

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1');
    });

    const submitBtn = screen.getByRole('button', { name: /Submit & Evaluate/i });
    await user.click(submitBtn);

    await act(async () => {
      if (sseErrorCallback) {
        sseErrorCallback(new Error('SSE connection failed'));
      }
    });

    await act(async () => {
      vi.advanceTimersByTime(5100);
    });

    expect(navigateMock).toHaveBeenCalledWith('/results/sub-123');
  });
});
