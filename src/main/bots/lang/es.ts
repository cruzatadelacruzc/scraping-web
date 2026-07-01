/**
 * Spanish fixed-string catalog for the bot module.
 *
 * Mirror of `en.ts`. Same shape, different text. Tests in
 * `src/__tests__/unit/bots/lang.test.ts` enforce parity.
 */
export const es = {
  common: {
    greeting: '¡Hola!',
    bye: '¡Adiós!',
    youAreNotLinked: 'Aún no has vinculado este chat a tu cuenta.',
    availableCommands: 'Comandos disponibles: /alarms, /subscription, /profile, /help',
    errorGeneric: 'Algo salió mal. Inténtalo de nuevo en un momento.',
    errorAiUnavailable: 'El asistente de IA no está disponible ahora. Prueba /alarms, /subscription o /profile.',
  },
  welcome: {
    greeting: '¡Hola! Bienvenido al bot de BazaarSentinel.',
    intro: 'Para empezar, vincula este chat a tu cuenta:',
    cta: 'Toca para crear una cuenta',
    alreadyHaveAccount: '¿Ya tienes cuenta? Abre la web y haz clic en "Vincular WhatsApp" para obtener un código.',
  },
  unlinked: {
    needsLink: 'Para usar el bot, primero vincula este chat a tu cuenta.',
    openWeb: 'Abre la web, ve a Configuración → Bots, y haz clic en "Vincular WhatsApp" para generar un código.',
    sendCode: 'Luego envía el código de 6 caracteres aquí.',
  },
  linkAccount: {
    promptCode: 'Por favor envía el código de 6 caracteres desde la web.',
    codeAccepted: '✅ ¡Vinculado! Ya puedes usar /alarms, /subscription y /profile.',
    codeInvalid: '❌ Ese código no es válido. Verifícalo en la web e inténtalo de nuevo.',
    codeExpired: '⌛ Ese código ha expirado. Genera uno nuevo en la web.',
    codeAlreadyUsed: '🔁 Ese código ya fue usado. Genera uno nuevo si necesitas re-vincular.',
  },
  help: {
    title: '¿Qué puedo hacer?',
    bullets: [
      '/alarms — lista tus alarmas de precio configuradas',
      '/subscription — muestra tu plan y estado actual',
      '/profile — muestra la información de tu cuenta',
      'O simplemente haz una pregunta y la IA te ayuda.',
    ],
  },
  alarms: {
    title: 'Tus alarmas:',
    none: 'No tienes alarmas configuradas. Abre la web para crear una.',
    item: (name: string, condition: string, threshold: string) => `• ${name} — ${condition} ${threshold}`,
  },
  subscription: {
    title: 'Tu suscripción:',
    plan: (planName: string) => `Plan: ${planName}`,
    status: (status: string) => `Estado: ${status}`,
    period: (start: string, end: string) => `Periodo: ${start} → ${end}`,
    none: 'No tienes una suscripción activa.',
  },
  profile: {
    title: 'Tu perfil:',
    username: (u: string) => `Usuario: ${u}`,
    email: (e: string) => `Email: ${e}`,
    displayName: (d: string) => `Nombre: ${d}`,
  },
  status: {
    online: 'El bot está en línea y funcionando.',
  },
  errors: {
    internal: 'Lo siento, algo salió mal de nuestro lado.',
    unlinked: 'No estás vinculado. Abre la web para generar un código de vínculo.',
    rateLimit: 'Estás enviando mensajes demasiado rápido. Por favor reduce la velocidad.',
    providerDown: 'El proveedor de chat no está conectado aún. Intenta de nuevo en un momento.',
  },
} as const;
