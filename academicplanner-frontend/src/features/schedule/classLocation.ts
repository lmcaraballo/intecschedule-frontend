/** Location text is evidence of virtual delivery, never of asynchronous study by itself. */
export function isVirtualLocation(location?: string): boolean {
  return /\bvirtual\b/i.test(location ?? '');
}

export function scheduledLocationLabel(location?: string): string {
  if (!location?.trim()) return 'Ubicación por confirmar';
  return isVirtualLocation(location) ? `${location} · con horario programado` : location;
}
