import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';
  const apiHost = new URL(apiUrl).hostname;

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^https?://${apiHost}`),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 50, maxAgeSeconds: 2592000 },
              },
            },
            {
              urlPattern: /\.(woff2|woff)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
              },
            },
          ],
        },
        devOptions: {
          // Disable the PWA dev service worker when MSW is active — two SWs
          // competing for control makes API mocking flaky in dev.
          enabled: env.VITE_MSW_ENABLED !== 'true',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@features': path.resolve(__dirname, './src/features'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@app': path.resolve(__dirname, './src/app'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: parseInt(env.VITE_DEV_PORT || '5174', 10),
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});