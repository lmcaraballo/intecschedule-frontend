import { dateKey, formatDate } from '../../utils/dateFormat';

export type InstitutionalDateKind = 'no_class' | 'milestone';
export interface InstitutionalDate { date: string; kind: InstitutionalDateKind; title: string; detail: string; }
export interface InstitutionalNotice extends InstitutionalDate { daysUntil: number; isUpcoming: boolean; }
export interface InstitutionalPeriod {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  timezone: string;
  sourceUrl: string;
  updatedAt: string;
  dates: InstitutionalDate[];
}

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
  updatedAt: '2026-10-01T00:00:00-04:00',
  dates: [
    { date: '2026-08-03', kind: 'milestone', title: 'Inicio de docencia', detail: 'Inicio oficial del trimestre agosto–octubre 2026.' },
    { date: '2026-08-06', kind: 'milestone', title: 'Inicia la selección tardía y modificación', detail: 'Disponible en línea y en las áreas académicas hasta el 7 de agosto.' },
    { date: '2026-08-07', kind: 'milestone', title: 'Fecha límite para solicitar tutorías', detail: 'Último día para que las áreas remitan las solicitudes a Registro.' },
    { date: '2026-08-10', kind: 'milestone', title: 'Inicia el retiro de asignaturas', detail: 'El retiro está disponible únicamente en línea hasta el 3 de octubre.' },
    { date: '2026-08-16', kind: 'no_class', title: 'Día de la Restauración', detail: 'No hay actividades académicas por el feriado nacional.' },
    { date: '2026-08-31', kind: 'milestone', title: 'Inician las evaluaciones de medio término', detail: 'El período de evaluaciones finaliza el 5 de septiembre.' },
    { date: '2026-09-24', kind: 'no_class', title: 'Día de Nuestra Señora de las Mercedes', detail: 'No hay actividades académicas por el feriado nacional.' },
    { date: '2026-09-26', kind: 'milestone', title: 'Fecha límite para calificaciones de medio término', detail: 'Último día para reportar las calificaciones de medio término.' },
    { date: '2026-10-02', kind: 'milestone', title: 'Finaliza el período para solicitar grado', detail: 'Fecha límite para la graduación de abril de 2027.' },
    { date: '2026-10-03', kind: 'milestone', title: 'Último día para retirar asignaturas', detail: 'El retiro está disponible únicamente en línea.' },
    { date: '2026-10-06', kind: 'milestone', title: 'Inicia la preselección de asignaturas', detail: 'La preselección para el próximo trimestre está disponible en línea.' },
    { date: '2026-10-09', kind: 'milestone', title: 'Fecha límite para solicitar reingreso', detail: 'Aplica al trimestre noviembre 2026–enero 2027.' },
    { date: '2026-10-10', kind: 'milestone', title: 'Ceremonia de graduación', detail: 'Actividad institucional sujeta a cambio.' },
    { date: '2026-10-12', kind: 'milestone', title: 'Última semana de docencia', detail: 'Última semana de docencia y evaluaciones finales.' },
    { date: '2026-10-17', kind: 'milestone', title: 'Finaliza la docencia', detail: 'El próximo período se mostrará cuando INTEC publique su calendario.' },
  ] satisfies InstitutionalDate[],
}] satisfies InstitutionalPeriod[];

let activeInstitutionalPeriods: InstitutionalPeriod[] = institutionalPeriods;

export function setInstitutionalPeriods(periods: InstitutionalPeriod[]) {
  activeInstitutionalPeriods = periods.length ? periods : institutionalPeriods;
}

export function getInstitutionalPeriods(): InstitutionalPeriod[] {
  return activeInstitutionalPeriods;
}

export function getInstitutionalPeriod(date: Date) {
  const key = dateKey(date);
  return activeInstitutionalPeriods.find((period) => period.startsOn <= key && key <= period.endsOn) ?? null;
}

export function getInstitutionalDate(date: Date): InstitutionalDate | null {
  const key = dateKey(date);
  return activeInstitutionalPeriods.flatMap((period) => period.dates).find((entry) => entry.date === key) ?? null;
}

export function isTeachingDate(date: Date): boolean {
  const period = getInstitutionalPeriod(date);
  return Boolean(period) && getInstitutionalDate(date)?.kind !== 'no_class';
}

export function getNextInstitutionalDate(now: Date): InstitutionalDate | null {
  const key = dateKey(now);
  return activeInstitutionalPeriods.flatMap((period) => period.dates).find((entry) => entry.date >= key) ?? null;
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
