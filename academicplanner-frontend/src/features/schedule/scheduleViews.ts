// The renderer registry can add `month` later without changing stored schedules.
export type ScheduleView = 'day' | 'week' | 'month';
export type AvailableScheduleView = Exclude<ScheduleView, 'month'>;
export const availableScheduleViews: { id: AvailableScheduleView; label: string }[] = [
  { id: 'day', label: 'Día' }, { id: 'week', label: 'Semana' },
];
