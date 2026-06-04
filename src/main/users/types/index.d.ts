import { IPlanDTO } from '@users/dto';
import { IAccountDTO } from '@users/dto/account.dto';

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Request {
    user?: any;
  }
}

/**
 * Plan DTO including full account information.
 */
export interface IPlanWithAccountsDTO extends IPlanDTO {
  accounts: IAccountDTO[];
}

export type SubscriptionsWithAccountDTO = AccountSubscriptionDTO & { account: AccountDTO };
