import { AuthCard } from '../components/AuthCard';

export default function RegisterPage() {
  return (
    <AuthCard title="Crear cuenta" description="Regístrate para comenzar">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input type="text" placeholder="Tu nombre" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" placeholder="tu@email.com" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <button className="w-full py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90">
          Registrarse
        </button>
      </form>
    </AuthCard>
  );
}