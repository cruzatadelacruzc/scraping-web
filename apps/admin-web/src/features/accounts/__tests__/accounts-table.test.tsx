import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountsTable } from '../components/accounts-table';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AccountsTable', () => {
  it('shows loading skeleton initially', () => {
    renderWithProviders(<AccountsTable />);
    // Should show skeleton elements while loading
    const rows = document.querySelectorAll('.animate-pulse');
    expect(rows.length).toBeGreaterThan(0);
  });
});
