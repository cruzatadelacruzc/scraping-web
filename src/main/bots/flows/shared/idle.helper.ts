import { t } from '@bots/lang';

/**
 * Regex naive para un código de 6 caracteres alfanuméricos.
 * Se usa dentro del link-account flow para capturar el código.
 */
export const LINK_CODE_REGEX = /^[A-Za-z0-9]{6}$/;

export function linkAccountPrompt(lang: string): string {
  return t(lang, 'linkAccount.promptCode');
}

export function linkAccountSuccess(lang: string): string {
  return `${t(lang, 'linkAccount.codeAccepted')}\n\n${t(lang, 'common.availableCommands')}`;
}
