import { toast } from 'sonner';

/**
 * Shows a sticky error toast with a working Retry action.
 *
 * The `onRetry` callback is invoked when the user clicks the Retry button
 * in the toast. The caller is responsible for wiring this to re-fire the
 * mutation with the same variables that caused the error.
 *
 * @param error  - The error whose `.message` is displayed in the toast.
 * @param onRetry - Zero-arg callback that re-fires the failed mutation.
 */
export function showRetryToast(error: Error, onRetry: () => void): void {
  toast.error(error.message, {
    duration: Infinity,
    action: {
      label: 'Retry',
      onClick: onRetry,
    },
  });
}
