import { ROUTES } from '@shared/config/routes';
import { Permission } from '@shared/permissions';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Bell, Cog, Database, Layers, Search, Shield, Tag, Users } from 'lucide-react';

export interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  permissions: Permission[];
}

/** Single source of truth for app navigation — consumed by SideNav and the command palette. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    path: ROUTES.DASHBOARD,
    icon: BarChart3,
    permissions: [Permission.VIEW_DASHBOARD],
  },
  {
    labelKey: 'nav.accounts',
    path: ROUTES.ACCOUNTS,
    icon: Database,
    permissions: [Permission.VIEW_ACCOUNTS],
  },
  {
    labelKey: 'nav.plans',
    path: ROUTES.PLANS,
    icon: Tag,
    permissions: [Permission.VIEW_PLANS],
  },
  { labelKey: 'nav.users', path: ROUTES.USERS, icon: Users, permissions: [Permission.VIEW_USERS] },
  { labelKey: 'nav.roles', path: ROUTES.ROLES, icon: Shield, permissions: [Permission.VIEW_ROLES] },
  {
    labelKey: 'nav.products',
    path: ROUTES.PRODUCTS,
    icon: Search,
    permissions: [Permission.VIEW_PRODUCTS],
  },
  {
    labelKey: 'nav.scrapers',
    path: ROUTES.SCRAPERS,
    icon: Bell,
    permissions: [Permission.VIEW_SCRAPERS],
  },
  { labelKey: 'nav.rules', path: ROUTES.RULES, icon: Layers, permissions: [Permission.VIEW_RULES] },
  {
    labelKey: 'nav.queues',
    path: ROUTES.QUEUES,
    icon: BarChart3,
    permissions: [Permission.VIEW_QUEUES],
  },
  {
    labelKey: 'nav.settings',
    path: ROUTES.SETTINGS,
    icon: Cog,
    permissions: [Permission.VIEW_SETTINGS],
  },
];
