import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnscheduledSubjects } from './UnscheduledSubjects';
import { parsePortalSchedule } from '../services/academicHttp';

describe('courses without weekly times', () => {
  it('preserves and displays subjects from the portal without inventing calendar times', () => {
    const session = parsePortalSchedule({
      student: { id: '1234567', isPino: false }, fetchedAt: '2026-09-18T12:00:00Z', classes: [],
      unscheduledSubjects: [{ id: 'pending', subjectCode: 'QA300', subjectName: 'Materia pendiente', section: '01' }],
    }, '1234567');
    render(<UnscheduledSubjects schedule={session.schedule} />);
    expect(screen.getByText('Sin horario asignado')).toBeInTheDocument();
    expect(screen.getByText(/QA300 · Materia pendiente/)).toBeInTheDocument();
    expect(session.schedule.classes).toEqual([]);
  });
  it('does not show a warning for existing schedules without the optional field', () => {
    render(<UnscheduledSubjects schedule={{ fetchedAt: '2026-09-18T12:00:00Z', classes: [] }} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
