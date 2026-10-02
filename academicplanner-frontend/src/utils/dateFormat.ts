export const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export function formatTime(time: string): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat('es-DO', options).format(date);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(fallback);
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value ? date : new Date(fallback);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const remaining = minutes % 60;
  return `${Math.floor(minutes / 60)} h${remaining ? ` ${remaining} min` : ''}`;
}

export function formatUpdatedAt(fetchedAt: string, now: Date = new Date()): string {
  const date = new Date(fetchedAt);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = formatDate(date, { hour: 'numeric', minute: '2-digit', hour12: true });
  if (dateKey(date) === dateKey(now)) return `Actualizado hoy a las ${time}`;
  if (dateKey(date) === dateKey(yesterday)) return `Actualizado ayer a las ${time}`;
  return `Actualizado el ${formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })} a las ${time}`;
}
