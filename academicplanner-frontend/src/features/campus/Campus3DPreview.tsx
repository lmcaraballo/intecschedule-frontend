import { useEffect, useId, useRef, useState } from 'react';
import type { AcademicClass } from '../../types/academic';
import { Icon } from '../../components/Icon';
import { isGenericPhysicalLocation, isVirtualLocation, scheduledLocationLabel } from '../schedule/classLocation';
import { resolveCampusBuilding } from './campusBuildings';

type Timing = 'current' | 'next' | 'detail';

// The geometry and rendering layers come from the local Intec Schedule campus model.
// It renders from bundled coordinates, so it does not need a Mapbox, Google, or Cesium key.
export function Campus3DPreview({ academicClass, timing }: { academicClass: AcademicClass; timing: Timing }) {
  const building = resolveCampusBuilding(academicClass.location);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapController = useRef<{ highlightBuilding(code?: string): void; focusCamera(code: string): void; zoomBy(amount: number): void; destroy(): void } | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [cameraView, setCameraView] = useState<'building' | 'campus'>('building');
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapSelection, setMapSelection] = useState<{ code: string; name: string } | undefined>(
    building ? { code: building.code, name: building.name } : undefined,
  );
  const previewElement = useRef<HTMLElement>(null);
  const closeExpandedButton = useRef<HTMLButtonElement>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const titleId = useId();
  const instructionsId = useId();
  const title = timing === 'current' ? 'Maqueta 3D de tu clase en curso' : timing === 'next' ? 'Maqueta 3D de tu próxima clase' : 'Ubicación 3D en el campus';

  useEffect(() => {
    if (!building || !mapElement.current) return;
    if (!window.WebGLRenderingContext) {
      setUnavailable(true);
      return;
    }
    let cancelled = false;
    setUnavailable(false);
    setIsMapReady(false);
    setCameraView('building');
    setMapSelection({ code: building.code, name: building.name });
    let controller: { highlightBuilding(code?: string): void; focusCamera(code: string): void; zoomBy(amount: number): void; destroy(): void } | undefined;

    const handleMapReady = () => setIsMapReady(true);
    mapElement.current.addEventListener('campus-map-ready', handleMapReady);

    void import('./threeD/campusMap.js')
      .then(({ initCampusMap }) => {
        if (cancelled || !mapElement.current) return;
        const nextController = initCampusMap(mapElement.current, {
          compact: timing !== 'detail',
          onBuildingSelect: (selection: { code: string; name: string }) => {
            setMapSelection(selection);
            setCameraView('building');
            setIsExpanded(true);
          },
        });
        controller = nextController;
        mapController.current = nextController;
        nextController.highlightBuilding(building.code);
        nextController.focusCamera(building.code);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      mapElement.current?.removeEventListener('campus-map-ready', handleMapReady);
      if (mapController.current === controller) mapController.current = undefined;
      controller?.destroy();
    };
  }, [building, timing, loadAttempt]);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    const containExpandedFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
        return;
      }
      if (event.key !== 'Tab' || !previewElement.current) return;
      const focusable = Array.from(previewElement.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', containExpandedFocus);
    closeExpandedButton.current?.focus();
    let refocusFrame = window.requestAnimationFrame(() => {
      refocusFrame = window.requestAnimationFrame(() => {
        mapController.current?.focusCamera(mapSelection?.code || building?.code || 'campus');
      });
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', containExpandedFocus);
      window.cancelAnimationFrame(refocusFrame);
      mapElement.current?.querySelector<HTMLElement>('.maplibregl-canvas')?.focus();
    };
  }, [building?.code, isExpanded, mapSelection?.code]);

  if (isVirtualLocation(academicClass.location)) {
    const virtualTitle = timing === 'current' ? 'Tu clase en curso es virtual' : timing === 'next' ? 'Tu próxima clase es virtual' : 'Este encuentro es virtual';
    return <section className="campus-location-pending campus-location-virtual" aria-labelledby={titleId}>
      <Icon name="book" />
      <div><p className="section-label">Modalidad virtual</p><h2 id={titleId}>{virtualTitle}</h2><p>No necesitas dirigirte a un edificio del campus. Confirma el enlace y las instrucciones de acceso en el Aula Virtual.</p><a href="https://campusvirtual.intec.edu.do/" target="_blank" rel="noopener noreferrer">Abrir Aula Virtual de INTEC</a></div>
    </section>;
  }
  if (!building) {
    const genericLocation = isGenericPhysicalLocation(academicClass.location);
    return <section className="campus-location-pending" aria-labelledby={titleId}>
      <Icon name="pin" />
      <div><h2 id={titleId}>{title}</h2><p>{genericLocation
        ? <>BeeCampus confirma que el encuentro es presencial, pero todavía no informa el edificio ni el número de aula.</>
        : <>La ubicación <strong>{scheduledLocationLabel(academicClass.location)}</strong> todavía no se puede relacionar con un edificio del campus.</>}</p></div>
    </section>;
  }

  return <section ref={previewElement} className={`campus-preview campus-preview--3d campus-preview--${timing}${isExpanded ? ' campus-preview--expanded' : ''}`} role={isExpanded ? 'dialog' : undefined} aria-modal={isExpanded || undefined} aria-labelledby={titleId}>
    <div className="campus-preview__heading"><div><p className="section-label">Campus INTEC</p><h2 id={titleId}>{isExpanded ? `Explorando ${mapSelection?.name || building.name}` : title}</h2></div><div className="campus-preview__actions"><span>{mapSelection?.code || building.code}</span>{isExpanded && <button ref={closeExpandedButton} type="button" onClick={() => setIsExpanded(false)}><Icon name="close" width="16" height="16" />Cerrar vista ampliada</button>}</div></div>
    <div className="campus-3d-map-shell">
      <div className="campus-3d-map" ref={mapElement} role="region" aria-label={`Maqueta 3D del campus INTEC con ${mapSelection?.name || building.name} resaltado`} aria-describedby={instructionsId} />
      <div className="campus-map-controls" role="group" aria-label="Controles de la maqueta 3D">
        <button type="button" onClick={() => mapController.current?.zoomBy(0.65)} disabled={!isMapReady} aria-label="Acercar mapa" title="Acercar">+</button>
        <button type="button" onClick={() => mapController.current?.zoomBy(-0.65)} disabled={!isMapReady} aria-label="Alejar mapa" title="Alejar">−</button>
        <button type="button" onClick={() => { mapController.current?.highlightBuilding(building.code); mapController.current?.focusCamera(building.code); setMapSelection({ code: building.code, name: building.name }); setCameraView('building'); }} disabled={!isMapReady} aria-pressed={cameraView === 'building'} aria-label={`Enfocar ${building.name}`}>Edificio</button>
        <button type="button" onClick={() => { mapController.current?.focusCamera('campus'); setCameraView('campus'); }} disabled={!isMapReady} aria-pressed={cameraView === 'campus'} aria-label="Ver campus completo">Campus</button>
      </div>
      <p id={instructionsId} className="campus-map-instructions">{isExpanded ? 'Vista ampliada. Arrastra para explorar y pulsa Esc para cerrar.' : 'Selecciona un edificio para ampliar. Arrastra para explorar.'}</p>
    </div>
    <div className="campus-preview__details"><div><Icon name="pin" /><span><strong>{mapSelection?.name || building.name}</strong><small>{mapSelection?.code || academicClass.location}</small></span></div>{unavailable ? <div className="campus-map-recovery" role="alert"><p>La maqueta 3D no pudo cargarse. La ubicación escrita sigue disponible.</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Volver a intentar</button></div> : <p>Edificio resaltado en rojo. La cámara conserva una vista clara del entorno inmediato.</p>}</div>
  </section>;
}
