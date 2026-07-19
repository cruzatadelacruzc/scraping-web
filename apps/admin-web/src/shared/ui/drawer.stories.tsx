import type { Meta, StoryObj } from '@storybook/react';
import '@shared/i18n/i18n';

import { Drawer } from './drawer';

const meta: Meta<typeof Drawer> = {
  title: 'Shared/Drawer',
  component: Drawer,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

function noop(): void {
  // storybook static story — close is a no-op
}

export const Open: Story = {
  args: {
    open: true,
    title: 'Detail panel',
    onClose: noop,
    children: (
      <dl className="space-y-md">
        <div>
          <dt className="text-label-xs font-mono text-on-surface-variant">Field</dt>
          <dd className="mt-xs text-body-md text-on-surface">Value</dd>
        </div>
      </dl>
    ),
  },
};

export const Closed: Story = {
  args: { ...Open.args, open: false },
};
