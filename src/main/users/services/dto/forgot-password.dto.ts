import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform(v => v.toLowerCase()),
});

export type ForgotPasswordType = z.infer<typeof ForgotPasswordSchema>;

export class ForgotPasswordDTO {
  public email: string;
  public constructor(data: ForgotPasswordType) {
    this.email = data.email;
  }

  public static from(data: Partial<ForgotPasswordType>): ForgotPasswordDTO {
    const parsed = ForgotPasswordSchema.parse(data);
    return new ForgotPasswordDTO(parsed);
  }
}
