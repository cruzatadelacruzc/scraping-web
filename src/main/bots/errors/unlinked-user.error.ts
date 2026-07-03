export class UnlinkedUserError extends Error {
  public constructor(public readonly preferredLang: string) {
    super('User is not linked to a bot conversation');
    this.name = 'UnlinkedUserError';
  }
}
