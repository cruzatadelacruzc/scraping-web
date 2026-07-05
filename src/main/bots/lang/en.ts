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
    greeting: 'Hello! Welcome to the BazaarSentinel bot.',
    intro: 'To get started, link this chat to your account:',
    cta: 'Tap to create an account',
    alreadyHaveAccount: 'Already have an account? Open the web app and click "Link Bot" to get a code.',
  },
  unlinked: {
    needsLink: 'To use the bot, you first need to link this chat to your account.',
    openWeb: 'Open the web app, go to Settings → Bots, and click "Link Bot" to generate a code.',
    sendCode: 'Then send the 6-character code here.',
  },
  linkAccount: {
    promptCode: 'Please send the 8-character code from the web app.',
    codeAccepted: '✅ Code accepted! Please confirm the link in the BazaarSentinel web app.',
    codeInvalid: '❌ That code is invalid. Double-check it in the web app and try again.',
    codeExpired: '⌛ That code has expired. Please generate a new one in the web app.',
    codeAlreadyUsed: '🔁 That code was already used. Generate a new one if you need to re-link.',
    pendingConfirmation: '⏳ A code has been validated from your {provider} chat. Please confirm in the web app to complete linking.',
    linkConfirmed: '✅ Link confirmed! Your account is now connected. You can use /alarms, /subscription and /profile.',
    linkDenied: '❌ Link request was denied. Generate a new code if you want to try again.',
    rateLimited: '⏱️ Too many attempts. Please wait {minutes} minutes and try again.',
    confirmRequired: 'For security, linking requires confirmation in the web app at {url}',
  },
  help: {
    title: 'What can I do?',
    bullets: [
      '/alarms — list your configured price alarms',
      '/subscription — show your current plan and status',
      '/profile — show your account information',
      'Or just ask a question and the AI will help.',
    ],
    availableCommands: 'Available commands:',
    commandAlarms: 'list your configured price alarms',
    commandSubscription: 'show your current plan and status',
    commandProfile: 'show your account information',
    commandHelp: 'show this help message',
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
  status: {
    online: 'Bot is online and running.',
  },
  errors: {
    internal: 'Sorry, something went wrong on our side.',
    unlinked: 'You are not linked. Open the web app to generate a link code.',
    rateLimit: 'You are sending messages too fast. Please slow down.',
    providerDown: 'The chat provider is not connected yet. Try again in a moment.',
  },
  commands: {
    help: 'See available commands and how to link your account',
    status: 'Check if the bot is online',
    link: 'Link your BazaarSentinel account',
    alarms: 'View your active alarms',
    subscription: 'View your plan and expiration',
    profile: 'View your profile',
    unlink: 'Unlink your account',
  },
} as const;
