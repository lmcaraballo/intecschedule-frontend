// Non-semantic academic accents. Never use the error/warning token palette.
const subjectTones = ['fern', 'slate', 'lavender', 'teal', 'olive'] as const;
export type SubjectTone = typeof subjectTones[number];

export function getSubjectColor(subjectCode: string): SubjectTone {
  let hash = 0;
  for (const char of subjectCode.trim().toUpperCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return subjectTones[hash % subjectTones.length]!;
}
