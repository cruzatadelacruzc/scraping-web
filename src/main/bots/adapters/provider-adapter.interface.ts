/**
 * Provider-agnostic adapter for bot interactions.
 *
 * Each messaging provider (Telegram, WhatsApp) has its own native
 * capabilities — reply keyboards, command menus, button templates.
 * Flows consume this interface so they never branch on provider name.
 */
export interface IProviderAdapter {
  /**
   * Sends the welcome message in the provider's native format.
   *
   * Telegram: text + {@code ReplyKeyboardMarkup}.
   * WhatsApp: plain text with slash-commands listed inline.
   */
  sendWelcome(chatId: number | string, text: string, linked: boolean): Promise<void>;

  /**
   * Applies the command menu for this chat.
   *
   * Telegram: {@code setMyCommands} with per-chat scope.
   * WhatsApp: no-op (no native command-menu concept).
   */
  applyCommands(chatId: number | string, linked: boolean): Promise<void>;
}
