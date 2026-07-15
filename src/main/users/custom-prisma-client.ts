import { PrismaClient, Prisma } from '@prisma/client';
import { getRequestContext } from '@shared/tenant-context-als';

// ---- List of models containing accountId ----
const modelsWithAccountId = new Set(['User', 'AccountSubscription', 'Alarm', 'Notification', 'BotLinkCode', 'BotConversation']);

// ---- Defining the extension that will apply accountId from ALS ----
const tenantExtension = Prisma.defineExtension(prisma =>
  prisma.$extends({
    name: 'tenant-filter',
    query: {
      // Intercepts all operations of all models (dynamic)
      $allModels: {
        // Note: signature uses `any` to avoid overly strict typing errors
        async $allOperations({ model, operation, args, query }: any): Promise<any> {
          // If the model doesn't use accountId, delegate the query as is
          if (!modelsWithAccountId.has(model)) {
            return query(args);
          }

          // Get tenantId from AsyncLocalStorage
          const ctx = getRequestContext();
          const tenantId = ctx?.tenantId;

          // Policy: if there's no tenantId, let it pass (you can change to throw)
          if (!tenantId) return query(args);

          // Helpers con tipo de retorno explícito
          const addAccountToWhere = (where: any): any => {
            if (!where) return { accountId: tenantId };
            return { AND: [{ accountId: tenantId }, where] };
          };

          // WhereUniqueInput does not accept a top-level AND — merge accountId
          // alongside the unique field instead (extended where unique, Prisma >= 5).
          const addAccountToUniqueWhere = (where: any): any => ({ ...where, accountId: tenantId });

          const addAccountToData = (data: any): any => {
            if (!data) return { accountId: tenantId };
            if (data.accountId && data.accountId !== tenantId) {
              throw new Error('Cannot set accountId different from current tenant');
            }
            return { accountId: tenantId, ...data };
          };

          // Operation handling (conservative)
          switch (operation) {
            case 'findUnique': {
              const newArgs = { ...args, where: addAccountToUniqueWhere(args?.where) };
              return query(newArgs);
            }

            case 'findFirst':
            case 'findMany':
            case 'count':
            case 'aggregate': {
              const newArgs = { ...args, where: addAccountToWhere(args?.where) };
              return query(newArgs);
            }

            case 'update':
            case 'delete': {
              if (!args?.where) throw new Error(`${operation} requires a where clause`);
              const newArgs = { ...args, where: addAccountToUniqueWhere(args.where) };
              return query(newArgs);
            }

            case 'updateMany':
            case 'deleteMany': {
              const newArgs = { ...args, where: addAccountToWhere(args?.where) };
              return query(newArgs);
            }

            case 'create': {
              const newArgs = { ...args, data: addAccountToData(args?.data) };
              return query(newArgs);
            }

            case 'createMany': {
              if (Array.isArray(args?.data)) {
                const mapped = args.data.map((d: any) => addAccountToData(d));
                return query({ ...args, data: mapped });
              }
              return query({ ...args, data: addAccountToData(args?.data) });
            }

            default:
              return query(args);
          }
        },
      },
    },
  }),
);

export function isPrismaUniqueConstraintError(err: any): boolean {
  // Prisma unique constraint error code is 'P2002'
  return !!(err && err.code === 'P2002');
}

// ---- Client creation: base + extension ----
const basePrisma = new PrismaClient();
const prisma = basePrisma.$extends(tenantExtension);

export default prisma;
export type PrismaClientType = typeof prisma;
