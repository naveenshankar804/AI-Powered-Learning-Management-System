import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { BrowserRouter } from 'react-router-dom';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/users/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, name: 'Student Test', tier: 'Pro' } })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question 1' }, { id: 2, title: 'Test Question 2' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissions: [
            { id: 1, question_id: 1, total_score: 100, status: 'completed' },
            { id: 2, question_id: 1, total_score: 100, status: 'completed' },
            { id: 3, question_id: 1, total_score: 100, status: 'completed' }
          ] })
        });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?student_id=1&limit=200');
    });

    // Check elements after loading
    expect(await screen.findByText(/Welcome back/)).toBeInTheDocument();

    // Check if the dashboard components rendered with mock data
    expect(screen.getAllByText('Test Question 1')[0]).toBeInTheDocument();

    // Check if progress badge logic processed the 100% score correctly
    expect(screen.getAllByText('Precision Pass')[0]).toBeInTheDocument();
  });

  it('renders correctly with no submissions', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/users/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, name: 'Student Test', tier: 'Pro' } })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissions: [] })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
    });

    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByText('Open the coding workspace and start your first challenge.')).toBeInTheDocument();
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });
});
