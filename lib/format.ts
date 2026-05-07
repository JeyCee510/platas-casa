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

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
