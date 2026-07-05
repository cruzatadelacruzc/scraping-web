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
    alreadyHaveAccount: '¿Ya tienes cuenta? Abre la web y haz clic en "Vincular Bot" para obtener un código.',
  },
  unlinked: {
    needsLink: 'Para usar el bot, primero vincula este chat a tu cuenta.',
    openWeb: 'Abre la web, ve a Configuración → Bots, y haz clic en "Vincular Bot" para generar un código.',
    sendCode: 'Luego envía el código de 6 caracteres aquí.',
  },
  linkAccount: {
    promptCode: 'Por favor envía el código de 8 caracteres desde la web.',
    codeAccepted: '✅ ¡Código aceptado! Por favor confirma el vínculo en la web de BazaarSentinel.',
    codeInvalid: '❌ Ese código no es válido. Verifícalo en la web e inténtalo de nuevo.',
    codeExpired: '⌛ Ese código ha expirado. Genera uno nuevo en la web.',
    codeAlreadyUsed: '🔁 Ese código ya fue usado. Genera uno nuevo si necesitas re-vincular.',
    pendingConfirmation:
      '⏳ Un código ha sido validado desde tu chat de {provider}. Por favor confirma en la web para completar el vínculo.',
    linkConfirmed: '✅ ¡Vínculo confirmado! Tu cuenta está conectada. Puedes usar /alarms, /subscription y /profile.',
    linkDenied: '❌ La solicitud de vínculo fue rechazada. Genera un nuevo código si quieres intentarlo de nuevo.',
    rateLimited: '⏱️ Demasiados intentos. Por favor espera {minutes} minutos e inténtalo de nuevo.',
    confirmRequired: 'Por seguridad, el vínculo requiere confirmación en la web en {url}',
  },
  help: {
    title: '¿Qué puedo hacer?',
    bullets: [
      '/alarms — lista tus alarmas de precio configuradas',
      '/subscription — muestra tu plan y estado actual',
      '/profile — muestra la información de tu cuenta',
      'O simplemente haz una pregunta y la IA te ayuda.',
    ],
    availableCommands: 'Comandos disponibles:',
    commandAlarms: 'lista tus alarmas de precio configuradas',
    commandSubscription: 'muestra tu plan y estado actual',
    commandProfile: 'muestra la información de tu cuenta',
    commandHelp: 'muestra esta ayuda',
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
  commands: {
    help: 'Ver comandos disponibles y cómo vincular tu cuenta',
    status: 'Verificar si el bot está en línea',
    link: 'Vincular tu cuenta de BazaarSentinel',
    alarms: 'Ver tus alarmas activas',
    subscription: 'Ver tu plan y vencimiento',
    profile: 'Ver tu perfil',
    unlink: 'Desvincular tu cuenta',
  },
} as const;
