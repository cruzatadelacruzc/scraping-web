import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../hooks/use-auth';
import { registerSchema } from '../validation/auth-schemas';
import type { Email, Password } from '../types/auth-types';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      await register({
        name: parsed.data.name,
        email: parsed.data.email as Email,
        password: parsed.data.password as Password,
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    }
  };

  return (
    <AuthCard title="Crear cuenta" description="Regístrate para comenzar">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-error bg-error-container p-3 rounded-md">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Tu nombre"
            className="w-full px-3 py-2 rounded-md border bg-surface-container outline-none focus:border-primary"
            disabled={isLoading}
            required
          />
        </div>
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
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Contraseña
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
          {isLoading ? 'Registrando...' : 'Registrarse'}
        </button>
        <div className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}