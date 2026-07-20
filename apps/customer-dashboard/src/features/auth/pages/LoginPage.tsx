import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../hooks/use-auth';

export default function LoginPage() {
  const { login, isLoginLoading } = useAuth();

  return (
    <AuthCard title="Iniciar sesión" description="Accede a tu cuenta">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="tu@email.com"
            className="w-full px-3 py-2 rounded-md border bg-surface-container outline-none focus:border-primary"
            disabled={isLoginLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-md border bg-surface-container outline-none focus:border-primary"
            disabled={isLoginLoading}
          />
        </div>
        <button className="w-full py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity">
          Entrar
        </button>
      </form>
    </AuthCard>
  );
}