export type ClassModality = 'virtual' | 'presential' | 'unknown';

const VIRTUAL_LOCATION = /(?:\bvirtual\b|\bvirtu\b|\bonline\b|\ben\s+l[ií]nea\b|\bremot[oa]\b|\bzoom\b|\bteams\b|\bgoogle\s+meet\b)/iu;
const GENERIC_PHYSICAL_LOCATION = /^(?:aula|sal[oó]n|presencial)$/iu;

/** Location text is evidence of virtual delivery, never of asynchronous study by itself. */
export function isVirtualLocation(location?: string): boolean {
  return VIRTUAL_LOCATION.test(location ?? '');
}

export function getClassModality(location?: string): ClassModality {
  if (!location?.trim()) return 'unknown';
  return isVirtualLocation(location) ? 'virtual' : 'presential';
}

/** BeeCampus sometimes confirms presenciality without publishing a room or building. */
export function isGenericPhysicalLocation(location?: string): boolean {
  return GENERIC_PHYSICAL_LOCATION.test(location?.trim() ?? '');
}

export function classModalityLabel(location?: string): string {
  const modality = getClassModality(location);
  return modality === 'virtual' ? 'Virtual' : modality === 'presential' ? 'Presencial' : 'Por confirmar';
}

export function scheduledLocationLabel(location?: string): string {
  if (!location?.trim()) return 'Ubicación por confirmar';
  if (isGenericPhysicalLocation(location)) return 'Aula por confirmar';
  return isVirtualLocation(location) ? `${location} · con horario programado` : location;
}
