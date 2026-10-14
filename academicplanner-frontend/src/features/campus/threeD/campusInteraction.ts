interface SelectionMap {
  getLayer(id: string): unknown;
  once(event: 'load', callback: () => void): unknown;
}

// Bug 599: isStyleLoaded puede volver a false al actualizar fuentes o colores.
// Si la capa ya existe, la selección se aplica sin esperar otro evento load.
// Antes de la primera carga, sólo la solicitud más reciente debe aplicarse.
export function createSelectionScheduler(map: SelectionMap) {
  let request = 0;
  return (apply: () => void) => {
    const current = ++request;
    const applyLatest = () => { if (current === request) apply(); };
    if (map.getLayer('buildings-3d')) applyLatest();
    else map.once('load', applyLatest);
  };
}

// Bug 600: el centro debe salir del mismo edificio que se resalta, no de
// una coordenada aproximada copiada de otro preset. El resto de la cámara no cambia.
export function centerCameraOnBuilding<T extends { center: number[] }>(
  preset: T, properties?: { centroid_lng?: number; centroid_lat?: number },
): T {
  const lng = properties?.centroid_lng;
  const lat = properties?.centroid_lat;
  return Number.isFinite(lng) && Number.isFinite(lat)
    ? { ...preset, center: [lng!, lat!] } : preset;
}
