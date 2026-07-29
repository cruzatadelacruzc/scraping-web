import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './app/App';
import { Providers } from './app/providers';
import { queryClient } from '@/shared/api/query-client';
import './styles/globals.css';

async function bootstrap() {
  // In dev, start the MSW worker (if enabled) and AWAIT it before rendering so
  // the first API requests are intercepted.
  if (import.meta.env.DEV) {
    const { startMockWorker } = await import('@/shared/mocking/browser');
    await startMockWorker();
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Providers>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                backgroundColor: 'var(--color-surface-container)',
                color: 'var(--color-on-surface)',
                border: '1px solid var(--color-outline-variant)',
              },
            }}
          />
        </Providers>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

void bootstrap();
