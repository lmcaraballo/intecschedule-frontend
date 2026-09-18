import { describe, expect, it } from 'vitest';
import { credentialsSchema } from './authSchema';

describe('access input boundaries', () => {
  it.each(['', '   ', '\t\n', '\u00a0'])('rejects an empty or whitespace-only password (%j)', (password) => {
    expect(credentialsSchema.safeParse({ studentId: 'qa', password }).success).toBe(false);
  });
  it.each(['', '   ', 'x'.repeat(65)])('rejects an invalid student ID', (studentId) => {
    expect(credentialsSchema.safeParse({ studentId, password: 'demo' }).success).toBe(false);
  });
  it('normalizes only the ID and preserves meaningful password whitespace', () => {
    expect(credentialsSchema.parse({ studentId: ' QA-Á🐝 ', password: ' demo secret ' }))
      .toEqual({ studentId: 'QA-Á🐝', password: ' demo secret ' });
  });
  it('enforces length limits without changing submitted passwords', () => {
    expect(credentialsSchema.safeParse({ studentId: 'q'.repeat(64), password: 'p'.repeat(256) }).success).toBe(true);
    expect(credentialsSchema.safeParse({ studentId: 'qa', password: 'p'.repeat(257) }).success).toBe(false);
  });
});
