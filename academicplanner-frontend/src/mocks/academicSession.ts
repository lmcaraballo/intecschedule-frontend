import type { AcademicClass, AcademicSession } from '../types/academic';

export const mockClasses: AcademicClass[] = [
  { id: 'mat-01-mon', subjectCode: 'MAT201', subjectName: 'Cálculo diferencial', section: '01', professor: 'Laura Méndez', day: 1, startTime: '08:00', endTime: '10:00', location: 'AULA AJ-203' },
  { id: 'sis-02-mon', subjectCode: 'SIS210', subjectName: 'Programación orientada a objetos', section: '02', professor: 'Andrés Castillo', day: 1, startTime: '11:00', endTime: '13:00', location: 'LABTI405' },
  { id: 'fis-01-tue', subjectCode: 'FIS201', subjectName: 'Física general', section: '01', professor: 'María Fernández', day: 2, startTime: '09:00', endTime: '11:00', location: 'GC301' },
  { id: 'hum-03-tue', subjectCode: 'HUM105', subjectName: 'Comunicación académica', section: '03', professor: 'Gabriel Pérez', day: 2, startTime: '14:00', endTime: '16:00', location: 'AULA AJ-105' },
  { id: 'mat-01-wed', subjectCode: 'MAT201', subjectName: 'Cálculo diferencial', section: '01', professor: 'Laura Méndez', day: 3, startTime: '08:00', endTime: '10:00', location: 'AULA AJ-203' },
  { id: 'sis-02-thu', subjectCode: 'SIS210', subjectName: 'Programación orientada a objetos', section: '02', professor: 'Andrés Castillo', day: 4, startTime: '11:00', endTime: '13:00', location: 'LABTI405' },
  { id: 'fis-01-fri', subjectCode: 'FIS201', subjectName: 'Física general', section: '01', professor: 'María Fernández', day: 5, startTime: '09:00', endTime: '11:00', location: 'GC301' },
  { id: 'lab-04-sat', subjectCode: 'FIS202L', subjectName: 'Laboratorio de física', section: '04', professor: 'Elena Vargas', day: 6, startTime: '09:00', endTime: '12:00', location: 'FD101' },
];

export function createMockSession(studentId: string): AcademicSession {
  return {
    student: { id: studentId, name: 'Estudiante Demo', isPino: true },
    schedule: { fetchedAt: new Date().toISOString(), classes: mockClasses.map((item) => ({ ...item })) },
  };
}
