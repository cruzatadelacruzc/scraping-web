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

const mockUseGetScraperConfigs = vi.fn();
const mockUseGetScraperConfig = vi.fn();
const mockCreateScraperConfig = vi.fn();
const mockUpdateScraperConfig = vi.fn();

vi.mock('../hooks/useGetScraperConfigs', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetScraperConfigs: (...args: unknown[]) => mockUseGetScraperConfigs(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetScraperConfig: (...args: unknown[]) => mockUseGetScraperConfig(...args),
}));

vi.mock('../hooks/useCreateScraperConfig', () => ({
  useCreateScraperConfig: () => ({
    mutate: mockCreateScraperConfig,
    isPending: false,
  }),
}));

vi.mock('../hooks/useUpdateScraperConfig', () => ({
  useUpdateScraperConfig: () => ({
    mutate: mockUpdateScraperConfig,
    isPending: false,
  }),
}));

// ── Component under test ───────────────────────────────────────────────────

import { ScraperConfigEditor } from '../components/revolico/scraper-config-form';

// ── Test data ──────────────────────────────────────────────────────────────

const mockConfigs = [
  {
    id: '1',
    storeKey: 'revolico:listing',
    expression: '$.items.*',
    enabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '2',
    storeKey: 'revolico:detail',
    expression: '$.product.*',
    enabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  },
];

// Helper to select a storeKey in the component
async function selectConfigKey(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.selectOptions(screen.getByLabelText('scrapers.revolico.config.selectStoreKey'), key);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setupLoadedState() {
  mockUseGetScraperConfigs.mockReturnValue({
    data: mockConfigs,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseGetScraperConfig.mockReturnValue({
    data: {
      id: '1',
      storeKey: 'revolico:listing',
      expression: '$.items.*',
      enabled: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
    isLoading: false,
    isError: false,
    error: null,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ScraperConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: loading state
    mockUseGetScraperConfigs.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGetScraperConfig.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
  });

  // ---- Loading ----

  it('shows loading skeleton while configs are loading', () => {
    renderWithProviders(<ScraperConfigEditor />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ---- Error ----

  it('shows error message with retry button when fetch fails', () => {
    const refetch = vi.fn();
    mockUseGetScraperConfigs.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    });

    renderWithProviders(<ScraperConfigEditor />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('common.retry')).toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked', async () => {
    const refetch = vi.fn();
    mockUseGetScraperConfigs.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    });

    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);
    await user.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // ---- Empty / no configs ----

  it('shows no configs message when configs list is empty', () => {
    mockUseGetScraperConfigs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ScraperConfigEditor />);
    expect(screen.getByText('scrapers.revolico.config.noConfigs')).toBeInTheDocument();
  });

  // ---- StoreKey selector and form ----

  it('renders storeKey selector when configs exist', () => {
    mockUseGetScraperConfigs.mockReturnValue({
      data: mockConfigs,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ScraperConfigEditor />);

    expect(screen.getByText('scrapers.revolico.config.selectStoreKey')).toBeInTheDocument();
    expect(screen.getByText('revolico:listing')).toBeInTheDocument();
    expect(screen.getByText('revolico:detail')).toBeInTheDocument();
  });

  it('renders expression textarea after selecting a storeKey', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');

    // Wait for RHF reset to propagate the expression value
    await screen.findByDisplayValue('$.items.*');
    expect(screen.getByText('scrapers.revolico.config.expression')).toBeInTheDocument();
  });

  it('shows save button after selecting a storeKey', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByDisplayValue('$.items.*');

    expect(screen.getByText('scrapers.revolico.config.save')).toBeInTheDocument();
  });

  it('shows create button for new config when response is null (404)', async () => {
    mockUseGetScraperConfigs.mockReturnValue({
      data: mockConfigs,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGetScraperConfig.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    expect(screen.getByText('scrapers.revolico.config.create')).toBeInTheDocument();
  });

  // ---- Validation ----

  it('shows expression required error when expression is empty', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByDisplayValue('$.items.*');

    // Clear the expression and click save
    const textarea = screen.getByRole('textbox', { name: 'scrapers.revolico.config.expression' });
    await user.clear(textarea);

    // Button should be disabled when expression is empty
    const saveButton = screen.getByText('scrapers.revolico.config.save').closest('button');
    expect(saveButton).toBeDisabled();
  });

  // ---- Confirmation dialog ----

  it('opens confirmation dialog when save is clicked with changed expression', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByDisplayValue('$.items.*');

    // Type something different to enable save
    const textarea = screen.getByRole('textbox', { name: 'scrapers.revolico.config.expression' });
    await user.clear(textarea);
    await user.type(textarea, '$.new.*');

    // Click save
    await user.click(screen.getByText('scrapers.revolico.config.save'));

    // Confirm dialog should show
    expect(screen.getByText('scrapers.revolico.config.confirmTitle')).toBeInTheDocument();
    expect(screen.getByText('scrapers.revolico.config.confirmDescription')).toBeInTheDocument();
  });

  it('calls update mutation when confirm is clicked for existing config', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByDisplayValue('$.items.*');

    // Type to change expression and enable save
    const textarea = screen.getByRole('textbox', { name: 'scrapers.revolico.config.expression' });
    await user.clear(textarea);
    await user.type(textarea, '$.new.*');

    await user.click(screen.getByText('scrapers.revolico.config.save'));

    // Confirm
    const confirmButton = screen.getByText('scrapers.revolico.config.confirmSave');
    await user.click(confirmButton);

    expect(mockUpdateScraperConfig).toHaveBeenCalledWith(
      { storeKey: 'revolico:listing', data: { expression: '$.new.*' } },
      expect.any(Object),
    );
  });

  it('calls create mutation when confirm is clicked for new config', async () => {
    mockUseGetScraperConfigs.mockReturnValue({
      data: mockConfigs,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGetScraperConfig.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByText('scrapers.revolico.config.create');

    // Type an expression
    const textarea = screen.getByRole('textbox', { name: 'scrapers.revolico.config.expression' });
    await user.type(textarea, '$.new.*');

    await user.click(screen.getByText('scrapers.revolico.config.create'));

    // Confirm
    const confirmButton = screen.getByText('scrapers.revolico.config.confirmSave');
    await user.click(confirmButton);

    expect(mockCreateScraperConfig).toHaveBeenCalledWith(
      { storeKey: 'revolico:listing', expression: '$.new.*' },
      expect.any(Object),
    );
  });

  it('closes confirmation dialog when cancel is clicked', async () => {
    setupLoadedState();
    const user = userEvent.setup();
    renderWithProviders(<ScraperConfigEditor />);

    await selectConfigKey(user, 'revolico:listing');
    await screen.findByDisplayValue('$.items.*');

    const textarea = screen.getByRole('textbox', { name: 'scrapers.revolico.config.expression' });
    await user.clear(textarea);
    await user.type(textarea, '$.new.*');
    await user.click(screen.getByText('scrapers.revolico.config.save'));

    // Cancel
    await user.click(screen.getByText('scrapers.revolico.config.cancel'));

    // Dialog should close
    expect(screen.queryByText('scrapers.revolico.config.confirmTitle')).not.toBeInTheDocument();
  });
});
