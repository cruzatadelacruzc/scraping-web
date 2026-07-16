import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars) {
        let result = key;
        for (const [k, v] of Object.entries(vars)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTriggerJob = vi.fn();

vi.mock('../hooks/useTriggerScrapingJob', () => ({
  useTriggerScrapingJob: () => ({
    mutate: mockTriggerJob,
    isPending: false,
  }),
}));

// ── Component under test ───────────────────────────────────────────────────

import { ScrapeNowForm } from '../components/revolico/scrape-now-form';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ScrapeNowForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Validation ----

  it('shows validation error when category is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });

  it('accepts form with only required category field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.type(screen.getByPlaceholderText('e.g. /computadoras/'), '/computadoras/');
    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    // Confirmation dialog should appear
    expect(screen.getByText('scrapers.revolico.job.confirmTitle')).toBeInTheDocument();
  });

  // ---- Confirmation dialog ----

  it('shows confirmation dialog before submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.type(screen.getByPlaceholderText('e.g. /computadoras/'), '/computadoras/');
    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    expect(screen.getByText('scrapers.revolico.job.confirmTitle')).toBeInTheDocument();
    expect(screen.getByText('scrapers.revolico.job.confirmDescription')).toBeInTheDocument();
  });

  it('calls trigger mutation with correct payload when confirmed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.type(screen.getByPlaceholderText('e.g. /computadoras/'), '/computadoras/');
    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    // Confirm
    await user.click(screen.getByText('scrapers.revolico.job.confirmTrigger'));

    expect(mockTriggerJob).toHaveBeenCalledWith({ category: '/computadoras/' }, expect.any(Object));
  });

  it('calls trigger mutation with optional subcategory when provided', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.type(screen.getByPlaceholderText('e.g. /computadoras/'), '/computadoras/');
    await user.type(screen.getByPlaceholderText('e.g. /computadoras/laptops/'), '/laptops/');
    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    // Confirm
    await user.click(screen.getByText('scrapers.revolico.job.confirmTrigger'));

    expect(mockTriggerJob).toHaveBeenCalledWith(
      { category: '/computadoras/', subcategory: '/laptops/' },
      expect.any(Object),
    );
  });

  it('closes confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScrapeNowForm />);

    await user.type(screen.getByPlaceholderText('e.g. /computadoras/'), '/computadoras/');
    await user.click(screen.getByText('scrapers.revolico.job.trigger'));

    // Cancel
    await user.click(screen.getByText('scrapers.revolico.job.cancel'));

    expect(screen.queryByText('scrapers.revolico.job.confirmTitle')).not.toBeInTheDocument();
  });

  // ---- All fields render ----

  it('renders all form fields', () => {
    renderWithProviders(<ScrapeNowForm />);

    expect(screen.getByPlaceholderText('e.g. /computadoras/')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. /computadoras/laptops/')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
  });
});
