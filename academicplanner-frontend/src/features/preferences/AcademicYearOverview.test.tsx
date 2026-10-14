import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AcademicYearOverview } from './AcademicYearOverview';

vi.mock('../institutional/InstitutionalCalendarProvider', () => ({
  useInstitutionalCalendar: () => ({
    status: 'fresh', lastUpdatedAt: '2026-10-12T12:00:00Z',
    periods: [{ id: 'qa', title: 'Trimestre QA', startsOn: '2026-10-01', endsOn: '2026-10-31',
      dates: Array.from({ length: 12 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`, title: `Actividad ${index + 1}`, kind: 'milestone',
      })),
    }],
  }),
}));

describe('calendario institucional completo — bug 596', () => {
  it('muestra también las actividades posteriores a la octava', () => {
    render(<MemoryRouter><AcademicYearOverview now={new Date('2026-10-12T12:00:00')} /></MemoryRouter>);
    expect(screen.getByText('Actividad 9')).toBeVisible();
    expect(screen.getByText('Actividad 12')).toBeVisible();
  });
});
