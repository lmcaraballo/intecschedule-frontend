import { dateKey, formatDate } from '../../utils/dateFormat';
import { annualInstitutionalPeriods } from './annualCalendarData';

export type InstitutionalDateKind = 'no_class' | 'milestone';
export interface InstitutionalDate { date: string; endsOn?: string | undefined; kind: InstitutionalDateKind; title: string; detail: string; }
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

// Registro versionado del año académico oficial agosto 2026–julio 2027.
export const institutionalPeriods = annualInstitutionalPeriods;

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

function sortedInstitutionalDates() {
  return activeInstitutionalPeriods.flatMap((period) => period.dates)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.kind === 'no_class') - Number(a.kind === 'no_class'));
}

export function getInstitutionalDate(date: Date): InstitutionalDate | null {
  const key = dateKey(date);
  const dates = sortedInstitutionalDates();
  return dates.find((entry) => entry.date === key && entry.kind === 'no_class')
    ?? dates.find((entry) => entry.date === key)
    ?? dates.find((entry) => entry.kind === 'no_class' && entry.date <= key && key <= (entry.endsOn ?? entry.date))
    ?? null;
}

export function isTeachingDate(date: Date): boolean {
  const period = getInstitutionalPeriod(date);
  return Boolean(period) && getInstitutionalDate(date)?.kind !== 'no_class';
}

export function getNextInstitutionalDate(now: Date): InstitutionalDate | null {
  const key = dateKey(now);
  return sortedInstitutionalDates().find((entry) => entry.date >= key) ?? null;
}

function isDailyNoticeRelevant(entry: InstitutionalDate) {
  return !/(solicitar grado|graduaci[oó]n|ceremonia de graduaci[oó]n)/i.test(`${entry.title} ${entry.detail}`);
}

/** The daily card prioritizes the next useful campus action, not long-range graduation milestones. */
export function getInstitutionalNotice(now: Date, maximumLeadDays = 7): InstitutionalNotice | null {
  const today = getInstitutionalDate(now);
  if (today && isDailyNoticeRelevant(today)) return { ...today, daysUntil: 0, isUpcoming: false };
  const key = dateKey(now);
  const next = sortedInstitutionalDates().find((entry) => entry.date >= key && isDailyNoticeRelevant(entry));
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
