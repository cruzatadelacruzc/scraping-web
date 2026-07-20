import { AuthCard } from '../components/AuthCard';

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Recuperar contraseña" description="Te enviaremos un enlace de recuperación">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" placeholder="tu@email.com" className="w-full px-3 py-2 rounded-md border bg-surface-container" />
        </div>
        <button className="w-full py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90">
          Enviar enlace
        </button>
      </form>
    </AuthCard>
  );
}