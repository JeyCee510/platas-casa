// Devuelve el nombre amigable del usuario para mostrar en la UI.
// Prioridad: user_metadata.full_name > user_metadata.first_name > local-part del email.

type AnyUser = {
  email?: string | null;
  user_metadata?: { full_name?: string | null; first_name?: string | null } | null;
} | null | undefined;

export function userDisplayName(user: AnyUser): string {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  if (meta.full_name) return meta.full_name;
  if (meta.first_name) return meta.first_name;
  if (user.email) return user.email.split('@')[0];
  return '';
}

// Versión corta: solo el primer nombre.
export function userShortName(user: AnyUser): string {
  const full = userDisplayName(user);
  return full.split(' ')[0] ?? full;
}
