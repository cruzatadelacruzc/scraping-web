export interface ILinkStatusResponse {
  linked: boolean;
  provider: string | null;
  externalId?: string; // masked chatId/phone
  preferredLang: string;
  lastActivity?: string; // ISO timestamp
  linkedAt?: string; // ISO timestamp
}

export interface IPendingLinkResponse {
  hasPending: boolean;
  codeId?: string;
  provider?: string;
  validatedAt?: string;
}
