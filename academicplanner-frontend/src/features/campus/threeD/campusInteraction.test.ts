import { describe, expect, it, vi } from 'vitest';
import { centerCameraOnBuilding, createSelectionScheduler } from './campusInteraction';

describe('selección y cámara del campus — bugs 599 y 600', () => {
  it('aplica el resaltado durante una actualización sin esperar otra carga', () => {
    const map = { getLayer: vi.fn(() => ({})), once: vi.fn(), isStyleLoaded: () => false };
    const apply = vi.fn();
    createSelectionScheduler(map)(apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(map.once).not.toHaveBeenCalled();
  });
  it('descarta selecciones antiguas solicitadas antes de cargar', () => {
    const pending: Array<() => void> = [];
    const map = { getLayer: () => undefined, once: (_event: string, callback: () => void) => pending.push(callback) };
    const select = createSelectionScheduler(map);
    const old = vi.fn(); const latest = vi.fn();
    select(old); select(latest); pending.forEach(callback => callback());
    expect(old).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });
  it('usa el centro del edificio elegido y conserva zoom, inclinación y orientación', () => {
    const preset = { center: [-69.9625, 18.4880], zoom: 18.8, pitch: 52, bearing: 0 };
    const center = { centroid_lng: -69.963, centroid_lat: 18.487 };
    expect(centerCameraOnBuilding(preset, center)).toEqual({ ...preset, center: [-69.963, 18.487] });
    expect(preset.center).toEqual([-69.9625, 18.4880]);
    expect(centerCameraOnBuilding(preset, {})).toBe(preset);
  });
});
