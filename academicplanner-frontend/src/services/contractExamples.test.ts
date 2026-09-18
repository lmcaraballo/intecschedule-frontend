import { describe, expect, it } from 'vitest';
import contract from '../../docs/openapi.json';
import { credentialsSchema } from '../features/auth/authSchema';
import { parseAcademicResponse } from './academicContract';
import { backendErrorCodeSchema, backendErrorSchema } from './academicErrors';

describe('published API contract examples', () => {
  const endpoint=contract.paths['/api/academic/schedule'].post;
  it('provides a valid request and matching academic response', () => {
    const request=credentialsSchema.parse(endpoint.requestBody.content['application/json'].example);
    expect(parseAcademicResponse(endpoint.responses['200'].content['application/json'].example,request.studentId).schedule.classes).toHaveLength(1);
  });
  it('documents every backend error supported by the client', () => {
    expect(contract.components.schemas.AcademicError.properties.error.properties.code.enum).toEqual(backendErrorCodeSchema.options);
    for(const [status,response] of Object.entries(endpoint.responses)) {
      if(status!=='200') expect(backendErrorSchema.safeParse(response.content['application/json'].example).success).toBe(true);
    }
  });
});
