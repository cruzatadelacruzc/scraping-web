import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../hooks/use-auth';
import { forgotPasswordSchema } from '../validation/auth-schemas';
import type { Email } from '../types/auth-types';

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    try {
      await forgotPassword({ email: parsed.data.email as Email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el enlace');
    }
  };

  if (sent) {
    return (
      <AuthCard title="Revisa tu email" description="Te hemos enviado un enlace de recuperación">
        <div className="text-center py-4">
          <p className="text-on-surface-variant mb-4">Si el email existe, recibirás un enlace para restablecer tu contraseña.</p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Volver al login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Recuperar contraseña" description="Te enviaremos un enlace de recuperación">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-error bg-error-container p-3 rounded-md">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="tu@email.com"
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
          {isLoading ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <div className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Volver al login
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}