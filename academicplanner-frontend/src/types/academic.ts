import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida');

export const studentProfileSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160).nullish().transform((value) => value ?? undefined),
  isPino: z.boolean(),
});

// ISO weekday: 1 = lunes, 7 = domingo. Times are local campus times.
export const academicClassSchema = z.object({
  id: z.string().trim().min(1),
  subjectCode: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  section: z.string().trim(),
  professor: z.string().trim().optional(),
  day: z.number().int().min(1).max(7),
  startTime: timeSchema,
  endTime: timeSchema,
  location: z.string().trim().optional(),
}).refine((value) => value.endTime > value.startTime, {
  message: 'La hora final debe ser posterior a la inicial',
  path: ['endTime'],
});

export const scheduleSchema = z.object({
  fetchedAt: z.iso.datetime({ offset: true }),
  unscheduledSubjects: z.array(z.object({
    reason: z.enum(['not_reported', 'to_be_announced', 'asynchronous']).optional(),
    id: z.string().trim().min(1),
    subjectCode: z.string().trim().min(1),
    subjectName: z.string().trim().min(1),
    section: z.string().trim(),
    professor: z.string().trim().optional(),
    location: z.string().trim().optional(),
  })).optional(),
  classes: z.array(academicClassSchema).refine(
    (classes) => new Set(classes.map((item) => item.id)).size === classes.length,
    'Los identificadores de clase deben ser únicos',
  ),
});

export const academicSessionSchema = z.object({
  student: studentProfileSchema,
  schedule: scheduleSchema,
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;
export type AcademicClass = z.infer<typeof academicClassSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type AcademicSession = z.infer<typeof academicSessionSchema>;
