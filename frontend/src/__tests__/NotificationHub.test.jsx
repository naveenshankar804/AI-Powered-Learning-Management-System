import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../components/ui/NotificationHub';

const TestComponent = () => {
  const { addNotification } = useNotifications();
  return (
    <button onClick={() => addNotification('success', 'Test Title', 'Test Message')}>
      Add Notification
    </button>
  );
};

describe('NotificationHub', () => {
  it('should display a notification when addNotification is called', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Add Notification'));

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });
  it('adds an error notification correctly', () => {
    let addNotification;

    const TestComponent = () => {
      const notifications = useNotifications();
      addNotification = notifications.addNotification;
      return null;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      addNotification('error', 'Error Title', 'Error message.');
    });

    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message.')).toBeInTheDocument();
  });

  it('adds a generic info notification correctly', () => {
    let addNotification;

    const TestComponent = () => {
      const notifications = useNotifications();
      addNotification = notifications.addNotification;
      return null;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      addNotification('info', 'Info Title', 'Info message.');
    });

    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Info message.')).toBeInTheDocument();
  });

  it('removes notification after 5 seconds via timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let addNotification;

    const TestComponent = () => {
      const notifications = useNotifications();
      addNotification = notifications.addNotification;
      return null;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      addNotification('success', 'Timeout Test', 'Will disappear');
    });

    expect(screen.getByText('Timeout Test')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Timeout Test')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('removes notification upon click', async () => {
    let addNotification;

    const TestComponent = () => {
      const notifications = useNotifications();
      addNotification = notifications.addNotification;
      return null;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      addNotification('success', 'To be removed', 'Will disappear');
    });

    expect(screen.getByText('To be removed')).toBeInTheDocument();

    const button = screen.getByRole('button');
    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.queryByText('To be removed')).not.toBeInTheDocument();
    });
  });
});
