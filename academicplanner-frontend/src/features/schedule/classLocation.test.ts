import { describe, it, expect } from 'vitest';
import { isVirtualLocation, scheduledLocationLabel } from './classLocation';
describe('virtual meeting locations', () => {
  it('preserves virtual meetings with assigned hours without claiming asynchronous delivery', () => {
    expect(scheduledLocationLabel('VIRTUAL')).toBe('VIRTUAL · con horario programado');
    expect(isVirtualLocation('Aula virtual')).toBe(true);
    expect(isVirtualLocation('LABTI405')).toBe(false);
    expect(scheduledLocationLabel('LABTI405')).toBe('LABTI405');
    expect(scheduledLocationLabel('')).toBe('Ubicación por confirmar');
  });
});
