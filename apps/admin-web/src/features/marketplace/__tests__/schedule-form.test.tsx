import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
  }),
}));

// ── Component under test ───────────────────────────────────────────────────

import { ScheduleForm } from '../components/schedules/schedule-form';
import type { StoreViewModel } from '../view-models/store-view-model';

// ── Test data ──────────────────────────────────────────────────────────────

const mockStores: StoreViewModel[] = [
  {
    key: 'revolico',
    displayName: 'Revolico',
    scrapingQueue: 'revolico-scraping',
    jobSchema: {
      fields: [
        {
          name: 'category',
          type: 'string',
          required: true,
          label: 'Category URL',
          placeholder: 'https://revolico.com/category/...',
        },
        {
          name: 'maxPages',
          type: 'number',
          required: false,
          label: 'Max Pages',
          placeholder: '5',
        },
        { name: 'scrapeImages', type: 'boolean', required: false, label: 'Scrape Images' },
      ],
    },
  },
  {
    key: 'facebook-marketplace',
    displayName: 'Facebook Marketplace',
    scrapingQueue: 'fb-marketplace-scraping',
    jobSchema: {
      fields: [
        {
          name: 'searchQuery',
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: '...',
        },
      ],
    },
  },
];

function renderForm(props: Partial<React.ComponentProps<typeof ScheduleForm>> = {}) {
  return render(
    <ScheduleForm
      stores={mockStores}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      submitLabel="Create"
      {...props}
    />,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ScheduleForm', () => {
  describe('validation', () => {
    it('shows name required error when name is empty', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByText('Create'));

      expect(screen.getByText('Schedule name is required')).toBeInTheDocument();
    });

    it('shows store required error when no store selected', async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill name to trigger only store error
      await user.type(screen.getByLabelText('scrapers.schedules.form.name'), 'Test Schedule');
      await user.click(screen.getByText('Create'));

      expect(screen.getByText('Store is required')).toBeInTheDocument();
    });

    it('shows cron required error when cron is empty', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText('scrapers.schedules.form.name'), 'Test Schedule');
      await user.click(screen.getByText('Create'));

      expect(screen.getByText('Cron expression is required')).toBeInTheDocument();
    });

    it('shows cron invalid error for bad expressions', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText('scrapers.schedules.form.name'), 'Test');
      await user.type(screen.getByLabelText('scrapers.schedules.form.cron'), 'bad cron expr');
      await user.click(screen.getByText('Create'));

      expect(screen.getByText(/Invalid cron expression/)).toBeInTheDocument();
    });

    it('accepts valid cron expressions', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderForm({ onSubmit });

      await user.type(screen.getByLabelText('scrapers.schedules.form.name'), 'Test');
      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');
      await user.type(screen.getByLabelText('scrapers.schedules.form.cron'), '0 0 * * *');
      await user.click(screen.getByText('Create'));

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('dynamic job fields', () => {
    it('shows select-store-first message when no store selected', () => {
      renderForm();

      expect(screen.getByText('scrapers.schedules.form.selectStoreFirst')).toBeInTheDocument();
    });

    it('renders string input for string-type schema fields', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');

      // String field should render as text input
      const categoryInput = screen.getByPlaceholderText('https://revolico.com/category/...');
      expect(categoryInput).toBeInTheDocument();
      expect(categoryInput).toHaveAttribute('type', 'text');
    });

    it('renders number input for number-type schema fields', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');

      const maxPagesInput = screen.getByPlaceholderText('5');
      expect(maxPagesInput).toBeInTheDocument();
      expect(maxPagesInput).toHaveAttribute('type', 'number');
    });

    it('renders checkbox for boolean-type schema fields', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');

      const checkboxes = screen.getAllByRole('checkbox');
      // enabled + scrapeImages
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });

    it('shows required indicator for required fields', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');

      expect(screen.getByText('Category URL')).toBeInTheDocument();
      // The * indicator for required field
      const requiredIndicators = document.querySelectorAll('.text-danger');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });

    it('switches job fields when store selection changes', async () => {
      const user = userEvent.setup();
      renderForm();

      // Select revolico - shows revolico fields
      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');
      expect(screen.getByPlaceholderText('https://revolico.com/category/...')).toBeInTheDocument();

      // Switch to facebook - shows facebook fields
      await user.selectOptions(
        screen.getByLabelText('scrapers.schedules.form.store'),
        'facebook-marketplace',
      );
      expect(screen.getByPlaceholderText('...')).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText('https://revolico.com/category/...'),
      ).not.toBeInTheDocument();
    });
  });

  describe('submit', () => {
    it('calls onSubmit with form values when valid', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderForm({ onSubmit });

      await user.type(screen.getByLabelText('scrapers.schedules.form.name'), 'My Schedule');
      await user.selectOptions(screen.getByLabelText('scrapers.schedules.form.store'), 'revolico');
      await user.type(screen.getByLabelText('scrapers.schedules.form.cron'), '30 6 * * 1');
      await user.click(screen.getByText('Create'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Schedule',
          store: 'revolico',
          cron: '30 6 * * 1',
          enabled: true,
        }),
      );
    });

    it('calls onCancel when cancel is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      renderForm({ onCancel });

      await user.click(screen.getByText('scrapers.schedules.form.cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables submit button while submitting', () => {
      renderForm({ isSubmitting: true });

      const submitButton = screen.getByText('scrapers.schedules.form.submitting');
      expect(submitButton).toBeDisabled();
    });
  });
});
