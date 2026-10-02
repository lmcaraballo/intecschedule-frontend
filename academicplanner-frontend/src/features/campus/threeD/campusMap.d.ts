export interface CampusMapController {
  highlightBuilding(code?: string): void;
  focusCamera(code: string): void;
  zoomBy(amount: number): void;
  setLighting(phase: 'morning' | 'day' | 'sunset' | 'night', theme: 'day' | 'night'): void;
  destroy(): void;
}

export function initCampusMap(
  container: HTMLElement,
  options?: {
    compact?: boolean;
    onBuildingSelect?: (selection: { code: string; name: string }) => void;
  },
): CampusMapController;
