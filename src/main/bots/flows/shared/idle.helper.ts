import { t } from '@bots/lang';

/**
 * Regex for an 8-character code using the safe alphabet
 * (no ambiguous characters: 0, O, I, l, 1).
 */
export const LINK_CODE_REGEX = /^[A-Za-z0-9]{8}$/;

export function linkAccountPrompt(lang: string): string {
  return t(lang, 'linkAccount.promptCode');
}

export function linkAccountSuccess(lang: string): string {
  return t(lang, 'linkAccount.codeAccepted');
}

export function linkAccountConfirmed(lang: string): string {
  return `${t(lang, 'linkAccount.linkConfirmed')}\n\n${t(lang, 'common.availableCommands')}`;
}
