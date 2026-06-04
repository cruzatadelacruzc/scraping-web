import { PrismaClient, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class AccountRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public async exists(accountId: string): Promise<boolean> {
    const count = await this.prisma.account.count({ where: { id: accountId } });
    return count > 0;
  }

  public create(data: Prisma.AccountCreateInput): Promise<Prisma.AccountGetPayload<{ include: { users: { select: { id: true } } } }>> {
    return this.prisma.account.create({
      data,
      include: { users: { select: { id: true } } },
    });
  }

  public findById(id: string): Promise<Prisma.AccountGetPayload<{ include: { users: { select: { id: true } } } }> | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: { users: { select: { id: true } } },
    });
  }

  public findAll(): Promise<Prisma.AccountGetPayload<{ include: { users: { select: { id: true } } } }>[]> {
    return this.prisma.account.findMany({
      include: { users: { select: { id: true } } },
    });
  }

  public update(
    id: string,
    data: Prisma.AccountUpdateInput,
  ): Promise<Prisma.AccountGetPayload<{ include: { users: { select: { id: true } } } }>> {
    return this.prisma.account.update({
      where: { id },
      data,
      include: { users: { select: { id: true } } },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.account.delete({ where: { id } });
  }
}
