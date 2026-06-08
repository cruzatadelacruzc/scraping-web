declare namespace Express {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface Request {
    tenantId: string;
    user?: {
      id: string;
      email: string;
      username: string;
      accountId: string;
      roles: string[];
      [key: string]: unknown;
    };
  }
}
