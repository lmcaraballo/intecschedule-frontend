export interface CampusBuilding {
  code: string;
  name: string;
  levels: number;
  facilities: string[];
  map: { x: number; y: number; width: number; height: number };
}

// Esta selección conserva los edificios y datos visibles del mapa local de INTEC Schedule.
// Es una referencia de orientación: no calcula rutas ni infiere edificios cuando el aula es ambigua.
export const campusBuildings: CampusBuilding[] = [
  { code: 'FD', name: 'Edificio Fernando Defilló', levels: 4, facilities: ['Laboratorio de TI', 'Laboratorio de Física'], map: { x: 42, y: 18, width: 58, height: 36 } },
  { code: 'AH', name: 'Edificio Ana Mercedes Henríquez', levels: 5, facilities: ['Área de Ciencias de la Salud', 'Laboratorio de Simulación'], map: { x: 118, y: 18, width: 68, height: 36 } },
  { code: 'PB', name: 'Edificio Pedro Francisco Bonó', levels: 3, facilities: ['Ciencias Sociales y Humanidades', 'Ciencias Básicas y Ambientales'], map: { x: 208, y: 18, width: 56, height: 36 } },
  { code: 'EL', name: 'Edificio de Postgrado Eduardo Latorre', levels: 5, facilities: ['Aulas de Postgrado', 'Foodcourt'], map: { x: 118, y: 70, width: 68, height: 38 } },
  { code: 'GC', name: 'Edificio Osvaldo García de la Concha', levels: 4, facilities: ['Área de Ingenierías', 'Taller MakerSpace'], map: { x: 198, y: 70, width: 88, height: 34 } },
  { code: 'Biblioteca', name: 'Biblioteca Emilio Rodríguez Demorizi', levels: 3, facilities: ['Tecnología de la Información', 'Unidad de Servicios Multimedia'], map: { x: 298, y: 62, width: 48, height: 64 } },
  { code: 'AJ', name: 'Edificio Arturo Jiménez Sabater', levels: 3, facilities: ['Planificación y Calidad', 'Laboratorio de Matemática Aplicada'], map: { x: 50, y: 90, width: 52, height: 48 } },
  { code: 'EP', name: 'Edificio Ercilla Pepín', levels: 5, facilities: ['Servicios Estudiantiles', 'Centro Internacional de Idiomas'], map: { x: 20, y: 142, width: 74, height: 34 } },
  { code: 'ER', name: 'Edificio Evangelina Rodríguez', levels: 3, facilities: ['Consultorio Médico', 'LAB INTEC'], map: { x: 112, y: 136, width: 60, height: 40 } },
  { code: 'LF', name: 'Edificio Los Fundadores', levels: 2, facilities: ['Rectoría', 'Becas y Créditos'], map: { x: 190, y: 134, width: 82, height: 42 } },
];

function normalizedLocation(location: string): string {
  return location.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

export function resolveCampusBuilding(location?: string): CampusBuilding | null {
  if (!location?.trim() || /\bVIRTUAL\b/i.test(location)) return null;
  const value = normalizedLocation(location);
  const code = /\bBIBLIOTECA\b/.test(value)
    ? 'Biblioteca'
    : /\bLAB\s*TI\b|\bLABTI\d/.test(value)
      ? 'FD'
      : campusBuildings.find((building) => new RegExp(`\\b${building.code}\\s*-?\\s*\\d`, 'i').test(value))?.code;
  return code ? campusBuildings.find((building) => building.code === code) ?? null : null;
}
