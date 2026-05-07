// Helper para detectar el rol del usuario.
// 'admin' (default) puede ver y editar todo.
// 'limited' solo puede registrar gastos y ver totales generales (sin detalle).

type AnyUser = {
  app_metadata?: any;
  email?: string | null;
} | null | undefined;

export type Role = 'admin' | 'limited';

export function getRole(user: AnyUser): Role {
  const role = user?.app_metadata?.role;
  if (role === 'limited') return 'limited';
  return 'admin';
}

export function isAdmin(user: AnyUser): boolean {
  return getRole(user) === 'admin';
}

export function isLimited(user: AnyUser): boolean {
  return getRole(user) === 'limited';
}
