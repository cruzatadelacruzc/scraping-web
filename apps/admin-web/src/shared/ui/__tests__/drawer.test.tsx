import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Drawer } from '../drawer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>): string => {
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

describe('Drawer', () => {
  it('renders title and children when open', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Detail" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('is hidden from the accessibility tree when closed', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={false} title="Detail" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );
    // aria-hidden panel is excluded from role queries
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed inside the panel', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Detail" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer open title="Detail" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );
    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the close button (with aria-label)', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Detail" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
