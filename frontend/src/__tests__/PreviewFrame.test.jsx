import { render, screen } from '@testing-library/react';
import PreviewFrame from '../components/workspace/PreviewFrame';
import { describe, it, expect, vi } from 'vitest';

describe('PreviewFrame', () => {
  it('renders iframe with correct src based on blob URL', () => {
    // Note: URL.createObjectURL is not available in jsdom natively unless mocked
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/1234');
    global.URL.revokeObjectURL = vi.fn();

    render(<PreviewFrame html="<h1>Test</h1>" css="" js="" />);

    const iframe = screen.getByTitle('Live Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'blob:http://localhost/1234');
  });
});
