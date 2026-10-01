export interface CampusMapController {
  highlightBuilding(code?: string): void;
  focusCamera(code: string): void;
  zoomBy(amount: number): void;
  destroy(): void;
}

export function initCampusMap(
  container: HTMLElement,
  options?: { compact?: boolean },
): CampusMapController;
