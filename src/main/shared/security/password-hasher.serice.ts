import { injectable } from 'inversify';
import bcrypt from 'bcryptjs';
import { CONFIG } from '@config/constants';

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

@injectable()
export class PasswordHasher implements IPasswordHasher {
  public async hash(password: string): Promise<string> {
    return bcrypt.hash(password, CONFIG.SALT_ROUNDS);
  }

  public async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
