import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AdminDashboard from '../pages/AdminDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('axios');

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url === '/api/admin/whitelist') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/admin/logs') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches data', async () => {
    renderComponent();

    expect(screen.getByText('System Access & Ops')).toBeInTheDocument();
    expect(screen.getByText('Library Whitelist Policy')).toBeInTheDocument();
    expect(screen.getByText('Worker Evaluation Logs')).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/admin/whitelist');
      expect(axios.get).toHaveBeenCalledWith('/api/admin/logs');
    });

    expect(screen.getByText('Zero Trust Enforced')).toBeInTheDocument();
    expect(screen.getByText('Worker Pool Idle')).toBeInTheDocument();
  });

  it('adds a domain to whitelist', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderComponent();

    const input = screen.getByPlaceholderText('e.g., cdn.jsdelivr.net');
    const addButton = screen.getByRole('button', { name: /Add/i });

    await userEvent.type(input, 'testdomain.com');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/admin/whitelist', { domain: 'testdomain.com' });
    });
  });

  it('displays fetched domains and logs', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/admin/whitelist') {
        return Promise.resolve({ data: [{ id: 1, domain: 'allowed.com' }] });
      }
      if (url === '/api/admin/logs') {
        return Promise.resolve({ data: [{ id: 101, html_score: 10, css_score: 20, js_score: 30, visual_score: 40 }] });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('allowed.com')).toBeInTheDocument();
    });

    // The log displays only the first 8 characters of ID String(101).slice(0, 8) => '101'
    expect(screen.getByText('101')).toBeInTheDocument();
  });
});
