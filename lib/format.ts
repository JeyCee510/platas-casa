export function formatUSD(n: number): string {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

export function monthLabel(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-US', {
    month: 'long', year: 'numeric',
  }).format(date);
}

// Fecha completa con día de semana: "Viernes, 31 de octubre de 2025"
export function fullDateLabel(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const formatted = new Intl.DateTimeFormat('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
  // Capitalizar primera letra (es lowercase por default)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Fecha de hoy en zona horaria de Ecuador (America/Guayaquil, UTC-5).
// Importante: NO usar new Date().toISOString() porque devuelve UTC y al tarde-noche en Ecuador
// ya es el día siguiente en UTC.
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function yesterdayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() - 86400000));
}
