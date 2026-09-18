import { z } from 'zod';

export const credentialsSchema = z.object({
  studentId: z.string().trim()
    .min(1, 'Escribe tu identificación o matrícula.')
    .max(100, 'Usa un máximo de 100 caracteres.')
    .refine(value => !value.includes('@') || /^\d+@est\.intec\.edu\.do$/i.test(value),
      'Usa tu matrícula o tu correo de estudiante @est.intec.edu.do.')
    .transform(value => value.replace(/^(\d+)@est\.intec\.edu\.do$/i, '$1'))
    .pipe(z.string().max(64, 'Usa un máximo de 64 caracteres para tu matrícula.')),
  password: z.string().min(1, 'Escribe tu contraseña institucional.').max(256, 'Usa un máximo de 256 caracteres.')
    .refine((value) => value.trim().length > 0, 'Escribe tu contraseña institucional.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;
