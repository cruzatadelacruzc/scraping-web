import { AuthCard } from '../components/AuthCard';

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Verificar email" description="Confirma tu dirección de correo">
      <div className="text-center py-4">
        <p className="text-on-surface-variant">Revisa tu email y haz clic en el enlace de verificación.</p>
        <button className="mt-4 px-4 py-2 rounded-md bg-primary text-on-primary font-medium hover:opacity-90">
          Reenviar email
        </button>
      </div>
    </AuthCard>
  );
}