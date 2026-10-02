import { describe, expect, it } from 'vitest';
import { completeSubjectName } from './subjectName';

describe('completeSubjectName', () => {
  it.each([
    ['ICSG202L', 'LABORATORIO DE ALGORITMOS MALI', 'LABORATORIO DE ALGORITMOS MALICIOSOS'],
    ['IINF325L', 'LABORATORIO ASEGURAMIENTO DE L', 'LABORATORIO ASEGURAMIENTO DE LA CALIDAD DE SOFTWARE'],
    ['IINF347', 'TENDENCIAS EN DESARROLLO DE SO', 'TENDENCIAS EN DESARROLLO DE SOFTWARE'],
    ['INGG214', 'ANÁLISIS DE DATOS EN INGENIERÍ', 'ANÁLISIS DE DATOS EN INGENIERÍA'],
  ])('restores the PeopleSoft abbreviation for %s', (code, abbreviated, expected) => {
    expect(completeSubjectName(code, abbreviated)).toBe(expected);
  });

  it('keeps an unrelated portal title unchanged', () => {
    expect(completeSubjectName('IINF325', 'CALIDAD Y PRUEBAS')).toBe('CALIDAD Y PRUEBAS');
  });
});
