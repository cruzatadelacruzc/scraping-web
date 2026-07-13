import type { JSX } from 'react';

export function App(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-display font-bold text-on-surface">BazaarSentinel</h1>
        <p className="mt-md text-lg text-on-surface-variant">Super Admin Console</p>
      </div>
    </div>
  );
}
