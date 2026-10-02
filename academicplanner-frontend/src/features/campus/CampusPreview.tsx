import type { AcademicClass } from '../../types/academic';
import { Campus3DPreview } from './Campus3DPreview';

export function CampusPreview({ academicClass, timing }: { academicClass: AcademicClass; timing: 'current' | 'next' | 'detail' }) {
  return <Campus3DPreview academicClass={academicClass} timing={timing} />;
}
