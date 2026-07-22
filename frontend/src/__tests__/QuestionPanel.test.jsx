import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionPanel from '../components/workspace/QuestionPanel';

describe('QuestionPanel', () => {
  it('renders a loading message when question is missing', () => {
    render(<QuestionPanel question={null} />);
    expect(screen.getByText('Loading question...')).toBeInTheDocument();
  });

  it('renders question details and requirements', () => {
    const mockQuestion = {
      title: 'Sample Question',
      description: '<p>Sample description.</p>',
      difficulty: 'Hard',
      requirements: ['Must use flexbox', 'Responsive']
    };
    render(<QuestionPanel question={mockQuestion} />);

    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Sample Question')).toBeInTheDocument();
    expect(screen.getByText('Must use flexbox')).toBeInTheDocument();
    expect(screen.getByText('Responsive')).toBeInTheDocument();
  });

  it('renders default difficulty when missing', () => {
    const mockQuestion = {
      title: 'No Diff Question',
      description: '...',
      requirements: []
    };
    render(<QuestionPanel question={mockQuestion} />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });
});
