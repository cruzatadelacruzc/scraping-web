# BazaarSentinel Customer Dashboard

> PWA para monitorear listados de productos en mercados online. Alertas en tiempo real cuando tus condiciones se cumplen.

## Tabla de Contenidos

- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Arquitectura](#arquitectura)
- [Scripts](#scripts)
- [Fases de Desarrollo](#fases-de-desarrollo)
- [Variables de Entorno](#variables-de-entorno)

## Instalación

1. **Requisitos:**
   - Node.js 20+ (recomendado v24)
   - pnpm 9+

2. **Instalar dependencias:**
```bash
pnpm install
```

3. **Variables de entorno:**
```bash
cp apps/customer-dashboard/.env.example apps/customer-dashboard/.env
```

## Desarrollo

```bash
# Terminal 1: Backend (PostgreSQL + Redis + MongoDB)
docker-compose up -d

# Terminal 2: Customer Dashboard
pnpm run dev -w apps/customer-dashboard
```

Abrir http://localhost:5174

## Arquitectura

### Stack

| Capa | Tecnología |
|------|------------|
| Framework | React 19 + Vite 5 |
| Lenguaje | TypeScript (strict mode) |
| Routing | React Router v6 |
| Server State | TanStack Query v5 |
| Client State | React Context (Auth/Theme) + Zustand (UI) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + CSS Variables |
| Testing | Vitest + React Testing Library + MSW |
| PWA | Workbox + Web Push API |

### Estructura de Carpetas

```
src/
├── app/
│   ├── App.tsx              # Root component
│   ├── routes.tsx           # Route definitions
│   ├── providers.tsx        # Context providers
│   └── layout/              # AuthLayout, AppLayout
├── features/
│   └── auth/
│       ├── context/         # AuthContext
│       ├── services/        # auth-api.ts, token-storage.ts
│       ├── types/           # branded types, interfaces
│       ├── validation/      # Zod schemas
│       ├── pages/           # LoginPage, RegisterPage, etc.
│       └── hooks/           # useAuth hook
├── shared/
│   ├── api/                 # client.ts, endpoints.ts
│   ├── ui/                  # ThemeProvider, ui-store
│   ├── pwa/                 # push-manager, preferences
│   └── mocking/             # MSW handlers + browser
└── styles/
    └── theme.css            # Dark mode tokens
```

### State Management

1. **TanStack Query** → Todo estado del servidor (API).
2. **React Context** → Sesión auth, tema, feature flags.
3. **Zustand `ui-store`** → Sidebar, notificaciones, modales.
4. **useState** → Estado local de componentes.

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm run dev -w apps/customer-dashboard` | Servidor desarrollo (port 5174) |
| `pnpm run build -w apps/customer-dashboard` | Build producción |
| `pnpm run lint -w apps/customer-dashboard` | ESLint |
| `pnpm run typecheck -w apps/customer-dashboard` | TypeScript check |
| `pnpm run test -w apps/customer-dashboard` | Vitest |
| `pnpm run storybook -w apps/customer-dashboard` | Storybook |

## Fases de Desarrollo

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Phase 0** | Infraestructura: Vite, PWA, rutas, placeholders | ✅ Completada |
| **Phase 1** | Auth real: login, register, forgot/reset, verify | 🔄 En progreso |
| **Phase 2** | Alarmas: CRUD, filtros, detalle | Pendiente |
| **Phase 3** | Notificaciones: lista, push, realtime | Pendiente |
| **Phase 4** | Bots: integración WhatsApp/Telegram | Pendiente |
| **Phase 5** | Cuenta: perfil, suscripción, facturación | Pendiente |

## Variables de Entorno

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# Development Server
VITE_DEV_PORT=5174

# PWA Push Notifications
VITE_VAPID_PUBLIC_KEY=

# MSW (Mock Service Worker) - true para desarrollo sin backend
VITE_MSW_ENABLED=false
```

## PWA Features

- **Offline:** IndexedDB cache para alarms, notifications, profile
- **Push:** Suscripción VAPID + notificaciones del Service Worker
- **Installable:** Manifest + icons (192px, 512px)

## Testing

```bash
# Unit tests
pnpm run test -w apps/customer-dashboard

# E2E (Playwright CLI)
npx playwright-cli open http://localhost:5174/login
npx playwright-cli snapshot
```

## Despliegue

```bash
# Backend debe estar corriendo
pnpm run build -w apps/customer-dashboard
# Deploy dist/ a tu servidor estático
```