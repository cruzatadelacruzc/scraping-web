import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth';

/** Root layout: hosts the AuthProvider INSIDE the data router so auth actions
 *  (which navigate) have router context. */
export function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
