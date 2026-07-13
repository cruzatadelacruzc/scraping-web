import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';

import './index.css';

import '@shared/i18n/i18n';

async function bootstrap(): Promise<void> {
  // Start MSW only when explicitly enabled (VITE_MSW_ENABLED=true in .env.local)
  // Used for offline development when the backend is not available.
  if (import.meta.env.VITE_MSW_ENABLED === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
