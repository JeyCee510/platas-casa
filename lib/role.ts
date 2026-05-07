// Helpers para roles.
//
// Roles:
// - admin    : Juan, super-usuario. Cambia roles de otros.
// - full     : Ana con acceso completo (igual que admin pero NO cambia roles).
// - limited  : Ana con vista simplificada (solo CTAs + total mensual; no detalle de cuentas/reportes).
// - readonly : Ana con vista completa pero sin botones de editar/borrar/crear.

type AnyUser = {
  app_metadata?: any;
  email?: string | null;
} | null | undefined;

export type Role = 'admin' | 'full' | 'limited' | 'readonly';

export function getRole(user: AnyUser): Role {
  const role = user?.app_metadata?.role;
  if (role === 'full') return 'full';
  if (role === 'limited') return 'limited';
  if (role === 'readonly') return 'readonly';
  return 'admin';
}

export function isAdmin(user: AnyUser): boolean {
  return getRole(user) === 'admin';
}

export function isLimited(user: AnyUser): boolean {
  return getRole(user) === 'limited';
}

// Acceso a vista completa: ve cuentas, reportes, detalle. NO necesariamente puede editar.
export function hasFullView(user: AnyUser): boolean {
  const r = getRole(user);
  return r === 'admin' || r === 'full' || r === 'readonly';
}

// Puede crear/editar/borrar.
export function canEdit(user: AnyUser): boolean {
  const r = getRole(user);
  return r === 'admin' || r === 'full' || r === 'limited';
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  full: 'Acceso completo',
  limited: 'Acceso limitado',
  readonly: 'Solo lectura',
};

export const ROLE_DESC: Record<Role, string> = {
  admin: 'Super-usuario. Puede cambiar permisos.',
  full: 'Lee y edita todo. No cambia permisos.',
  limited: 'Solo registra gastos/ingresos. Ve totales pero no detalle de cuentas/reportes.',
  readonly: 'Ve todo (lista, cuentas, reportes) pero no puede crear/editar/borrar.',
};
