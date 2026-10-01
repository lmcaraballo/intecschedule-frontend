import { describe, expect, it } from 'vitest';
import { resolveCampusBuilding } from './campusBuildings';

describe('campus building resolution', () => {
  it('recognizes the building code in institutional classroom labels', () => {
    expect(resolveCampusBuilding('AULA AJ-103')?.code).toBe('AJ');
    expect(resolveCampusBuilding('GC315')?.name).toBe('Edificio Osvaldo García de la Concha');
    expect(resolveCampusBuilding('LABTI405')?.code).toBe('FD');
  });

  it('does not invent a building for virtual or ambiguous locations', () => {
    expect(resolveCampusBuilding('VIRTUAL')).toBeNull();
    expect(resolveCampusBuilding('Aula')).toBeNull();
  });
});
