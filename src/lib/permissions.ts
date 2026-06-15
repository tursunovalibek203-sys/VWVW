export const ROLES = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  SELLER: 'SELLER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  DRIVER: 'DRIVER'
} as const;

export type RoleType = keyof typeof ROLES;

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_SALES: 'VIEW_SALES',
  CREATE_SALE: 'CREATE_SALE',
  MANAGE_INVENTORY: 'MANAGE_INVENTORY',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  ACCESS_CASHIER_PANEL: 'ACCESS_CASHIER_PANEL',
  ACCESS_WAREHOUSE_PANEL: 'ACCESS_WAREHOUSE_PANEL'
} as const;

export type PermissionType = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, (PermissionType | '*')[]> = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.CASHIER]: [
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.ACCESS_CASHIER_PANEL
  ],
  [ROLES.SELLER]: [
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.ACCESS_CASHIER_PANEL
  ],
  [ROLES.WAREHOUSE_MANAGER]: [
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.ACCESS_WAREHOUSE_PANEL
  ],
  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.DRIVER]: [
    PERMISSIONS.ACCESS_CASHIER_PANEL
  ]
};

/**
 * Foydalanuvchining ma'lum bir ruxsati bor-yo'qligini tekshirish
 */
export const checkPermission = (userRole?: string, permission?: PermissionType): boolean => {
  if (!userRole || !permission) return false;
  
  const role = userRole.toUpperCase();
  const perms = ROLE_PERMISSIONS[role] || [];
  
  return perms.includes('*') || perms.includes(permission);
};
