import { dateKey, formatDate } from '../../utils/dateFormat';

export type InstitutionalDateKind = 'no_class' | 'milestone';
export interface InstitutionalDate { date: string; kind: InstitutionalDateKind; title: string; detail: string; }
export interface InstitutionalNotice extends InstitutionalDate { daysUntil: number; isUpcoming: boolean; }

// Fuente institucional revisada para el trimestre agosto–octubre de 2026.
// Este registro versionado sustituye al horario semanal infinito. Cuando INTEC
// publique el siguiente calendario se añade un período, no se extrapolan fechas.
export const institutionalPeriods = [{
  id: '2026-T3',
  title: 'Trimestre agosto–octubre 2026',
  startsOn: '2026-08-03',
  endsOn: '2026-10-17',
  timezone: 'America/Santo_Domingo',
  sourceUrl: 'https://www.intec.edu.do/estudiantes/calendarios/calendario-trimestral',
  dates: [
    { date: '2026-08-16', kind: 'no_class', title: 'Día de la Restauración', detail: 'No hay actividades académicas por el feriado nacional.' },
    { date: '2026-09-24', kind: 'no_class', title: 'Feriado nacional', detail: 'No hay docencia programada.' },
    { date: '2026-10-03', kind: 'milestone', title: 'Último día para retirar asignaturas', detail: 'El retiro está disponible únicamente en línea.' },
    { date: '2026-10-06', kind: 'milestone', title: 'Inicia la preselección de asignaturas', detail: 'La preselección para el próximo trimestre está disponible en línea.' },
    { date: '2026-10-12', kind: 'milestone', title: 'Última semana de docencia', detail: 'Revisa entregas, evaluaciones y cambios confirmados.' },
    { date: '2026-10-17', kind: 'milestone', title: 'Finaliza la docencia', detail: 'El próximo período se mostrará cuando INTEC publique su calendario.' },
  ] satisfies InstitutionalDate[],
}] as const;

export function getInstitutionalPeriod(date: Date) {
  const key = dateKey(date);
  return institutionalPeriods.find((period) => period.startsOn <= key && key <= period.endsOn) ?? null;
}

export function getInstitutionalDate(date: Date): InstitutionalDate | null {
  const key = dateKey(date);
  return institutionalPeriods.flatMap((period) => period.dates).find((entry) => entry.date === key) ?? null;
}

export function isTeachingDate(date: Date): boolean {
  const period = getInstitutionalPeriod(date);
  return Boolean(period) && getInstitutionalDate(date)?.kind !== 'no_class';
}

export function getNextInstitutionalDate(now: Date): InstitutionalDate | null {
  const key = dateKey(now);
  return institutionalPeriods.flatMap((period) => period.dates).find((entry) => entry.date >= key) ?? null;
}

/** Upcoming milestones must read as future notices, never as if they were happening today. */
export function getInstitutionalNotice(now: Date, maximumLeadDays = 14): InstitutionalNotice | null {
  const today = getInstitutionalDate(now);
  if (today) return { ...today, daysUntil: 0, isUpcoming: false };
  const next = getNextInstitutionalDate(now);
  if (!next) return null;
  const todayAtNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const target = new Date(`${next.date}T12:00:00`);
  const daysUntil = Math.round((target.getTime() - todayAtNoon.getTime()) / 86_400_000);
  if (daysUntil < 1 || daysUntil > maximumLeadDays) return null;
  const lowerTitle = `${next.title.charAt(0).toLocaleLowerCase('es-DO')}${next.title.slice(1)}`;
  const title = daysUntil === 1 ? `Mañana: ${lowerTitle}` : `En ${daysUntil} días: ${lowerTitle}`;
  const date = formatDate(target, { weekday: 'long', day: 'numeric', month: 'long' });
  return { ...next, title, detail: `Fecha institucional: ${date}. ${next.detail}`, daysUntil, isUpcoming: true };
}
