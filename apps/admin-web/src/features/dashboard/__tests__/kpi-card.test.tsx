import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../components/kpi-card';

describe('KpiCard', () => {
  it('renders the label and value', () => {
    render(<KpiCard label="Total Accounts" value={42} />);
    expect(screen.getByText('Total Accounts')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a positive delta', () => {
    render(<KpiCard label="Users" value={156} delta={12} />);
    expect(screen.getByText('+12')).toBeInTheDocument();
  });

  it('renders a negative delta with danger styling', () => {
    render(<KpiCard label="Alarms" value={3} delta={-2} />);
    const delta = screen.getByText('-2');
    expect(delta).toBeInTheDocument();
    expect(delta.className).toContain('text-danger');
  });

  it('shows skeleton when loading', () => {
    render(<KpiCard label="Loading" value={0} isLoading />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kpi-skeleton')).toBeInTheDocument();
  });
});
