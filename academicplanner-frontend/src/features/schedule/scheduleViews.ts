export type ScheduleView = 'day' | 'week' | 'month';
export type AvailableScheduleView = ScheduleView;
export const availableScheduleViews: { id: AvailableScheduleView; label: string }[] = [
  { id: 'day', label: 'Día' }, { id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' },
];

export function isScheduleView(value: string | null): value is AvailableScheduleView {
  return value === 'day' || value === 'week' || value === 'month';
}
