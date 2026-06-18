/**
 * English fixed-string catalog for the bot module.
 *
 * Every key referenced by a flow or service must exist here AND in `es.ts`.
 * Tests in `src/__tests__/unit/bots/lang.test.ts` enforce parity.
 */
export const en = {
  common: {
    greeting: 'Hello!',
    bye: 'Goodbye!',
    youAreNotLinked: "You haven't linked this chat to your account yet.",
    availableCommands: 'Available commands: /alarms, /subscription, /profile, /help',
    errorGeneric: 'Something went wrong. Please try again in a moment.',
    errorAiUnavailable: 'AI assistant is currently unavailable. Try /alarms, /subscription or /profile.',
  },
  welcome: {
    greeting: 'Hello! Welcome to the price monitor bot.',
    intro: 'To get started, link this chat to your account:',
    cta: 'Tap to create an account',
    alreadyHaveAccount: 'Already have an account? Open the web app and click "Link WhatsApp" to get a code.',
  },
  unlinked: {
    needsLink: 'To use the bot, you first need to link this chat to your account.',
    openWeb: 'Open the web app, go to Settings → Bots, and click "Link WhatsApp" to generate a code.',
    sendCode: 'Then send the 6-character code here.',
  },
  linkAccount: {
    promptCode: 'Please send the 6-character code from the web app.',
    codeAccepted: '✅ Linked! You can now use /alarms, /subscription and /profile.',
    codeInvalid: '❌ That code is invalid. Double-check it in the web app and try again.',
    codeExpired: '⌛ That code has expired. Please generate a new one in the web app.',
    codeAlreadyUsed: '🔁 That code was already used. Generate a new one if you need to re-link.',
  },
  help: {
    title: 'What can I do?',
    bullets: [
      '/alarms — list your configured price alarms',
      '/subscription — show your current plan and status',
      '/profile — show your account information',
      'Or just ask a question and the AI will help.',
    ],
  },
  alarms: {
    title: 'Your alarms:',
    none: 'You have no alarms configured. Open the web app to create one.',
    item: (name: string, condition: string, threshold: string) => `• ${name} — ${condition} ${threshold}`,
  },
  subscription: {
    title: 'Your subscription:',
    plan: (planName: string) => `Plan: ${planName}`,
    status: (status: string) => `Status: ${status}`,
    period: (start: string, end: string) => `Period: ${start} → ${end}`,
    none: 'You have no active subscription.',
  },
  profile: {
    title: 'Your profile:',
    username: (u: string) => `Username: ${u}`,
    email: (e: string) => `Email: ${e}`,
    displayName: (d: string) => `Display name: ${d}`,
  },
  errors: {
    internal: 'Sorry, something went wrong on our side.',
    unlinked: 'You are not linked. Open the web app to generate a link code.',
    rateLimit: 'You are sending messages too fast. Please slow down.',
    providerDown: 'The chat provider is not connected yet. Try again in a moment.',
  },
} as const;
