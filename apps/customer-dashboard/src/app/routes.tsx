import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '@/shared/auth';
import { AuthModal, LandingLayout } from '@/features/landing';
import { RootLayout } from './layout/RootLayout';
import AuthLayout from './layout/AuthLayout';
import AppLayout from './layout/AppLayout';
import ForgotPasswordPage from '@features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from '@features/auth/pages/VerifyEmailPage';
import SecuritySettingsPage from '@features/auth/pages/SecuritySettingsPage';
import AlarmsPage from '@features/alarms/pages/AlarmsPage';
import { Placeholder } from './components/Placeholder';
import { NotFound } from './components/NotFound';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Pre-auth surfaces
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/',
            element: <LandingLayout />,
            children: [
              { index: true, element: null },
              { path: 'login', element: <AuthModal mode="login" /> },
              { path: 'register', element: <AuthModal mode="register" /> },
            ],
          },
          {
            element: <AuthLayout />,
            children: [
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
              { path: 'reset-password/:token?', element: <ResetPasswordPage /> },
              { path: 'verify-email/:token?', element: <VerifyEmailPage /> },
            ],
          },
        ],
      },
      // Authenticated surfaces
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: 'dashboard',
                element: <Placeholder titleKey="nav.dashboard" note="Phase 2" />,
              },
              { path: 'profile', element: <SecuritySettingsPage /> },
              { path: 'alarms', element: <AlarmsPage /> },
              {
                path: 'notifications',
                element: <Placeholder titleKey="nav.notifications" note="Phase 3" />,
              },
              { path: 'bots', element: <Placeholder titleKey="nav.bots" note="Phase 4" /> },
              { path: 'account', element: <Placeholder titleKey="nav.account" note="Phase 5" /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
