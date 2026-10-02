import type { Credentials } from '../features/auth/authSchema';
import { mockAcademicApi } from '../mocks/academicApi';
import { fetchAcademicSession } from './academicHttp';
import type { FetchOptions } from './academicContract';

export { AcademicApiError } from './academicErrors';
export type { AcademicApiErrorCode } from './academicErrors';
export type { AccessStage, FetchOptions, MockScenario } from './academicContract';

// Never fall back to invented classes. Mock data is available only when the
// environment explicitly asks for it (tests and a labelled demonstration).
export const isAcademicMock = import.meta.env.VITE_ACADEMIC_API_MODE === 'mock';

// UI keeps one interface; only this boundary selects the transport.
export const academicApi = {
  fetchSession(credentials: Credentials, options: FetchOptions = {}): Promise<unknown> {
    return isAcademicMock
      ? mockAcademicApi.fetchSession(credentials, options)
      : fetchAcademicSession(credentials, options);
  },
};
