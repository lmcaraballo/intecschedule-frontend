import { describe, it, expect } from 'vitest';
import { classModalityLabel, getClassModality, isGenericPhysicalLocation, isVirtualLocation, scheduledLocationLabel } from './classLocation';
describe('virtual meeting locations', () => {
  it('preserves virtual meetings with assigned hours without claiming asynchronous delivery', () => {
    expect(scheduledLocationLabel('VIRTUAL')).toBe('VIRTUAL · con horario programado');
    expect(isVirtualLocation('Aula virtual')).toBe(true);
    expect(isVirtualLocation('Google Meet')).toBe(true);
    expect(isVirtualLocation('Sesión en línea')).toBe(true);
    expect(isVirtualLocation('LABTI405')).toBe(false);
    expect(scheduledLocationLabel('LABTI405')).toBe('LABTI405');
    expect(scheduledLocationLabel('')).toBe('Ubicación no publicada');
    expect(scheduledLocationLabel('Aula')).toBe('Aula pendiente de actualizar');
    expect(isGenericPhysicalLocation('SALÓN')).toBe(true);
    expect(isGenericPhysicalLocation('AULA AJ-103')).toBe(false);
  });

  it('derives modality for each meeting instead of for the whole subject', () => {
    expect(getClassModality('VIRTUAL')).toBe('virtual');
    expect(getClassModality('VIRTU')).toBe('virtual');
    expect(classModalityLabel('VIRTUAL')).toBe('Virtual');
    expect(getClassModality('AULA AJ-203')).toBe('presential');
    expect(classModalityLabel('AULA AJ-203')).toBe('Presencial');
    expect(getClassModality('')).toBe('unknown');
    expect(classModalityLabel()).toBe('No informada');
  });
});
