export interface UserViewModel {
  id: string;
  email: string;
  username: string;
  displayName: string;
  roles: string[];
  emailVerified: boolean;
  createdAt: Date;
}

export interface RoleViewModel {
  id: string;
  name: string;
  userCount: number;
  active: boolean;
}
