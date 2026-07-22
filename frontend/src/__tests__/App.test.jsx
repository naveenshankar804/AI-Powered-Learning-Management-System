import { render, screen } from '@testing-library/react';
import React from 'react';

test('renders correctly', () => {
  render(<div>Assessment Engine</div>);
  expect(screen.getByText('Assessment Engine')).toBeInTheDocument();
});
