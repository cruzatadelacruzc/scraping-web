import { z } from 'zod';

/**
 * Zod schemas aligned to the backend contract. Validation messages are i18n
 * keys (namespace `common`) — `FormMessage` translates them at render via t().
 */

const email = z.string().min(1, 'validation.required').email('validation.email');

const strongPassword = z
  .string()
  .min(8, 'validation.min8')
  .regex(/[A-Z]/, 'validation.passwordStrength')
  .regex(/[a-z]/, 'validation.passwordStrength')
  .regex(/[0-9]/, 'validation.passwordStrength');

const username = z
  .string()
  .min(3, 'validation.username')
  .max(30, 'validation.username')
  .regex(/^[a-z0-9_-]+$/, 'validation.username');

// Login: `username` is email-or-username (lowercased server-side) → just non-empty.
export const loginSchema = z.object({
  username: z.string().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().optional(),
    email,
    username,
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'validation.passwordsNoMatch',
    path: ['confirmPassword'],
  });
export type RegisterDTO = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'validation.passwordsNoMatch',
    path: ['confirmPassword'],
  });
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.required'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'validation.passwordsNoMatch',
    path: ['confirmPassword'],
  });
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: email,
  password: z.string().min(1, 'validation.required'),
});
export type ChangeEmailDTO = z.infer<typeof changeEmailSchema>;
