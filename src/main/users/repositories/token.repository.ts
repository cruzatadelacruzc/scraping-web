import { inject, injectable } from 'inversify';
import { PrismaClient, PasswordResetToken, EmailVerificationToken, RefreshToken, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';

export interface ICreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ICreateEmailVerificationTokenData {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ICreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
}

@injectable()
export class TokenRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient) {}

  // ---- Password Reset Tokens ----

  public async createPasswordResetToken(data: ICreatePasswordResetTokenData): Promise<PasswordResetToken> {
    return this._prisma.passwordResetToken.create({ data });
  }

  public async findPasswordResetTokensByUserId(userId: string): Promise<PasswordResetToken[]> {
    return this._prisma.passwordResetToken.findMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  public async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this._prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ---- Email Verification Tokens ----

  public async createEmailVerificationToken(data: ICreateEmailVerificationTokenData): Promise<EmailVerificationToken> {
    return this._prisma.emailVerificationToken.create({ data });
  }

  public async findEmailVerificationTokensByUserId(userId: string): Promise<EmailVerificationToken[]> {
    return this._prisma.emailVerificationToken.findMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  public async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await this._prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ---- Refresh Tokens ----

  public async createRefreshToken(data: ICreateRefreshTokenData): Promise<RefreshToken> {
    return this._prisma.refreshToken.create({ data });
  }

  public async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this._prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  public async revokeRefreshToken(id: string): Promise<void> {
    await this._prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  public async replaceRefreshToken(id: string, replacedById: string): Promise<void> {
    await this._prisma.refreshToken.update({
      where: { id },
      data: { replacedBy: replacedById, revokedAt: new Date() },
    });
  }

  public async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this._prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeRefreshTokenFamily(family: string, exceptId?: string): Promise<void> {
    const where: Prisma.RefreshTokenWhereInput = { family, revokedAt: null };
    if (exceptId) {
      where.id = { not: exceptId };
    }
    await this._prisma.refreshToken.updateMany({
      where,
      data: { revokedAt: new Date() },
    });
  }
}
