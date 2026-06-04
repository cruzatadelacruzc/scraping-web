import { z } from 'zod';

export const UserProviderRegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  provider: z.string(),
  providerId: z.string(),
  accountId: z.string().uuid(),
  roleIds: z.array(z.string()).optional(),
});

export type UserProviderRegisterDTO = z.infer<typeof UserProviderRegisterSchema>;
