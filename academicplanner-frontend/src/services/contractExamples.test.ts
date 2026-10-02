import { describe, expect, it } from 'vitest';
import contract from '../../docs/openapi.json';
import { LOGIN_ENDPOINT, ACADEMIC_ENDPOINT, loginResponseSchema, parsePortalSchedule } from './academicHttp';
import { createMockSession } from '../mocks/academicSession';

describe('published development API contract', () => {
  it('uses the documented POST routes and bearer authorization', () => {
    expect(LOGIN_ENDPOINT).toBe(`/api${'/user/login'}`);
    expect(ACADEMIC_ENDPOINT).toBe(`/api${'/schedule'}`);
    expect(contract.paths['/user/login'].post.requestBody.required).toBe(true);
    expect(contract.paths['/schedule'].post.security).toEqual([{HTTPBearer:[]}]);
    expect(contract.components.securitySchemes.HTTPBearer.scheme).toBe('bearer');
  });
  it('normalizes the documented flat response without changing storage', () => {
    expect(contract.components.schemas.ScheduleResponse.required).toEqual(['student','fetchedAt','classes']);
    const session=createMockSession('QA-STUDENT');
    expect(parsePortalSchedule({student:session.student,...session.schedule},'QA-STUDENT')).toEqual(session);
    expect(loginResponseSchema.parse({accessToken:'fictional-token',refreshToken:'unused',tokenType:'bearer',expiresIn:900})).not.toHaveProperty('refreshToken');
  });
});
