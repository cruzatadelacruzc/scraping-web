import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider, publishNotification } from '@shared/notifications';

import { NotificationBell } from '../components/notification-bell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>): string => {
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

function renderBell(): void {
  render(
    <MemoryRouter>
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  it('shows no badge initially and an empty panel on open', () => {
    renderBell();
    const trigger = screen.getByRole('button', { name: 'Open notifications' });
    expect(trigger.textContent).toBe('');

    fireEvent.click(trigger);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('shows the unread badge and lists published notifications', () => {
    renderBell();

    act(() => {
      publishNotification({ title: 'Redis is down', severity: 'error' });
      publishNotification({ title: 'Jobs failed', severity: 'warning' });
    });

    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }));
    expect(screen.getByText('Redis is down')).toBeInTheDocument();
    expect(screen.getByText('Jobs failed')).toBeInTheDocument();
  });

  it('caps the visible badge at 9+', () => {
    renderBell();
    act(() => {
      for (let i = 0; i < 12; i++) {
        publishNotification({ title: 'n' + String(i) });
      }
    });
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('mark all as read clears the badge but keeps the list', () => {
    renderBell();
    act(() => {
      publishNotification({ title: 'One' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }));
    fireEvent.click(screen.getByText('Mark all as read'));

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getByText('One')).toBeInTheDocument();
  });
});
