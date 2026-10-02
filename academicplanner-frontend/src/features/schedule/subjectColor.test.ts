import { describe, expect, it } from 'vitest';
import { getSubjectColor } from './subjectColor';

describe('subject colors', () => {
  it('is stable across normalization, calls and schedule ordering', () => {
    const first = getSubjectColor('MAT201');
    getSubjectColor('FIS201');
    expect(getSubjectColor(' mat201 ')).toBe(first);
    expect(getSubjectColor('MAT201')).toBe(first);
  });
  it('uses only the non-semantic academic palette', () => {
    for (let i = 0; i < 100; i++) expect(['fern', 'slate', 'lavender', 'teal', 'olive']).toContain(getSubjectColor(`SUB${i}`));
  });
});
