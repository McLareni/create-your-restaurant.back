export interface PermissionActionDefinition {
  id: string;
  label: string;
}

export interface PermissionModuleDefinition {
  moduleKey: string;
  moduleName: string;
  actions: PermissionActionDefinition[];
}

export const PERMISSION_REGISTRY: PermissionModuleDefinition[] = [
  {
    moduleKey: 'staff',
    moduleName: 'Персонал та Команда',
    actions: [
      { id: 'staff:read', label: 'Перегляд списку працівників' },
      { id: 'staff:create', label: 'Створення працівників' },
      { id: 'staff:update', label: 'Редагування працівників' },
      { id: 'staff:delete', label: 'Видалення працівників' },
      { id: 'staff:roles', label: 'Управління посадами та правами' },
    ],
  },
  {
    moduleKey: 'menu-engine',
    moduleName: 'Конструктор Меню',
    actions: [
      { id: 'menu:read', label: 'Перегляд меню' },
      { id: 'menu:create', label: 'Створення страв та категорій' },
      { id: 'menu:update', label: 'Редагування страв та категорій' },
      { id: 'menu:delete', label: 'Видалення страв та категорій' },
    ],
  },
  {
    moduleKey: 'qr-tables',
    moduleName: 'QR-Коди та Столи',
    actions: [
      { id: 'tables:read', label: 'Перегляд столів' },
      { id: 'tables:manage', label: 'Управління столами та QR' },
    ],
  },
  {
    moduleKey: 'live-calls',
    moduleName: 'Live-Монітор',
    actions: [
      { id: 'live-calls:read', label: 'Перегляд викликів' },
      { id: 'live-calls:resolve', label: 'Закриття викликів' },
    ],
  },
  {
    moduleKey: 'inventory',
    moduleName: 'Склад та Інвентаризація',
    actions: [
      { id: 'inventory:read', label: 'Перегляд залишків' },
      { id: 'inventory:manage', label: 'Редагування залишків' },
    ],
  },
  {
    moduleKey: 'pos-sync',
    moduleName: 'Інтеграція з POS',
    actions: [
      { id: 'pos:read', label: 'Перегляд статусу POS' },
      { id: 'pos:manage', label: 'Синхронізація та налаштування' },
    ],
  },
  {
    moduleKey: 'analytics',
    moduleName: 'Аналітика',
    actions: [{ id: 'analytics:read', label: 'Перегляд звітів' }],
  },
  {
    moduleKey: 'orders',
    moduleName: 'Замовлення',
    actions: [
      { id: 'orders:read', label: 'Перегляд історії замовлень' },
      { id: 'orders:manage', label: 'Редагування та скасування замовлень' },
    ],
  },
];

export const PERMISSIONS = {
  STAFF_READ: 'staff:read',
  STAFF_CREATE: 'staff:create',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',
  STAFF_ROLES: 'staff:roles',
  MENU_READ: 'menu:read',
  MENU_CREATE: 'menu:create',
  MENU_UPDATE: 'menu:update',
  MENU_DELETE: 'menu:delete',
  TABLES_READ: 'tables:read',
  TABLES_MANAGE: 'tables:manage',
  LIVE_READ: 'live-calls:read',
  LIVE_RESOLVE: 'live-calls:resolve',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_MANAGE: 'inventory:manage',
  POS_READ: 'pos:read',
  POS_MANAGE: 'pos:manage',
  ANALYTICS_READ: 'analytics:read',
  ORDERS_READ: 'orders:read',
  ORDERS_MANAGE: 'orders:manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
