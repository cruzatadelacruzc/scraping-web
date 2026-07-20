export const authService = {
  login: async (_credentials: { email: string; password: string }) => {
    return { token: 'stub' };
  },
};