import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../hooks/use-auth';
import { resetPasswordSchema } from '../validation/auth-schemas';
import type { Token, Password } from '../types/auth-types';

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuth();
  const { token } = useParams<{ token: string }>();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Token no encontrado');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    try {
      await resetPassword({ token: parsed.data.token as Token, password: parsed.data.password as Password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    }
  };

  if (success) {
    return (
      <AuthCard title="Listo" description="Tu contraseña ha sido actualizada">
        <div className="text-center py-4">
          <p className="text-on-surface-variant mb-4">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Ir al login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nueva contraseña" description="Establece tu nueva contraseña">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-error bg-error-container p-3 rounded-md">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-md border bg-surface-container outline-none focus:border-primary"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-md border bg-surface-container outline-none focus:border-primary"
            disabled={isLoading}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </AuthCard>
  );
}