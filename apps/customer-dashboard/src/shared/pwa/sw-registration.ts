import { toast } from 'sonner';

// Vite-plugin-pwa generates this virtual module at build time
// @ts-expect-error - virtual module from vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

export function setupSWRegistration() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const updateSW = registerSW({
        onNeedRefresh() {
          toast.info('New version available', {
            action: {
              label: 'Update',
              onClick: () => updateSW(true),
            },
            duration: Infinity,
          });
        },
        onOfflineReady() {
          toast.success('App ready for offline use');
        },
        immediate: true,
      });
    });
  }
}
