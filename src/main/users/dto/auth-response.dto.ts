import { z } from 'zod';
import { UserDTO } from './user.dto';

export const AuthResponseSchema = z.object({
  user: z.unknown(), // Will be validated as UserDTO at runtime
  token: z.string().min(1),
  refreshToken: z.string().optional(),
});

export type AuthResponseDTO = {
  user: UserDTO;
  token: string;
  refreshToken?: string;
};

export const parseAuthResponse = (data: unknown): AuthResponseDTO => {
  const parsed = AuthResponseSchema.parse(data);
  return parsed as AuthResponseDTO;
};
