import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Token inválido');

export const authCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

export type AuthCredentialsDTO = z.infer<typeof authCredentialsSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema>;