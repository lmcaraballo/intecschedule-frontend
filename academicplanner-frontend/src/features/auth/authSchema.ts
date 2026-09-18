import { z } from 'zod';

export const credentialsSchema = z.object({
  studentId: z.string().trim().min(1, 'Escribe tu identificación o matrícula.').max(64, 'Usa un máximo de 64 caracteres.'),
  password: z.string().min(1, 'Escribe tu contraseña institucional.').max(256, 'Usa un máximo de 256 caracteres.')
    .refine((value) => value.trim().length > 0, 'Escribe tu contraseña institucional.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;
