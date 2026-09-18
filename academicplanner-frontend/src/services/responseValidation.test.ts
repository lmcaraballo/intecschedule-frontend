import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSession } from '../mocks/academicSession';
import { parseAcademicResponse } from './academicContract';
import { consultSchedule } from './consultSchedule';
import { academicApi } from './academicApi';
import { scheduleStorage, ACADEMIC_STORAGE_KEY } from '../storage/scheduleStorage';

const id = 'qa';
const mutations: [string, (value: any) => void][] = [
  ['missing schedule', v => delete v.schedule],
  ['missing classes', v => delete v.schedule.classes],
  ['null classes', v => v.schedule.classes = null],
  ['text classes', v => v.schedule.classes = 'text'],
  ['invalid timestamp', v => v.schedule.fetchedAt = 'invalid'],
  ['impossible timestamp', v => v.schedule.fetchedAt = '2026-02-30T12:00:00Z'],
  ['missing ID', v => delete v.schedule.classes[0].id],
  ['missing subject', v => delete v.schedule.classes[0].subjectName],
  ['whitespace ID', v => v.schedule.classes[0].id = '  '],
  ['whitespace subject', v => v.schedule.classes[0].subjectName = '  '],
  ['whitespace code', v => v.schedule.classes[0].subjectCode = '  '],
  ['negative day', v => v.schedule.classes[0].day = -1],
  ['day eight', v => v.schedule.classes[0].day = 8],
  ['string day', v => v.schedule.classes[0].day = '1'],
  ['invalid start', v => v.schedule.classes[0].startTime = '25:00'],
  ['invalid end', v => v.schedule.classes[0].endTime = '8:00'],
  ['reversed time', v => v.schedule.classes[0].endTime = '07:59'],
  ['zero duration', v => v.schedule.classes[0].endTime = v.schedule.classes[0].startTime],
  ['duplicate ID', v => v.schedule.classes.push({...v.schedule.classes[0]})],
  ['wrong boolean', v => v.student.isPino = 'false'],
];
beforeEach(() => localStorage.clear());
describe('untrusted responses preserve the last valid schedule', () => {
  it.each(mutations)('rejects %s before writing', async (_label, mutate) => {
    scheduleStorage.save(createMockSession(id));
    const previous = localStorage.getItem(ACADEMIC_STORAGE_KEY);
    const response = createMockSession(id);
    mutate(response);
    vi.spyOn(academicApi, 'fetchSession').mockResolvedValue(response);
    await expect(consultSchedule({ studentId: id, password: 'fictional' })).rejects.toMatchObject({code:'INVALID_RESPONSE'});
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(previous);
  });
  it('accepts unavailable optional descriptions and section without losing an otherwise valid schedule', () => {
    const response = createMockSession(id);
    response.schedule.classes[0]!.section = '';
    response.schedule.classes[0]!.professor = '  ';
    response.schedule.classes[0]!.location = '  ';
    const parsed = parseAcademicResponse(response, id);
    expect(parsed.schedule.classes[0]).toMatchObject({ section: '', professor: '', location: '' });
  });
});
