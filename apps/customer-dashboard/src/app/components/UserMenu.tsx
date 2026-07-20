import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/use-auth';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 text-sm hover:bg-surface-container"
      >
        <div className="size-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-surface-container border border-outline-variant shadow-lg">
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm hover:bg-surface-container-high"
            onClick={() => setOpen(false)}
          >
            Perfil
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-error-container"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}