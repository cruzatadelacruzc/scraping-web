import { AuthCard } from '../components/AuthCard';

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Nueva contraseña" description="Establece tu nueva contraseña">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
          <input type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
          <input type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <button className="w-full py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90">
          Guardar
        </button>
      </form>
    </AuthCard>
  );
}