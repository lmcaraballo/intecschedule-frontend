import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { buildingsData } from './campusData.js';
import { campusFeatures } from './campusFeatures.js';
import { cameraPresets } from './campusCameras.js';
import { campusContextBuildings, campusContextRoads } from './campusContext.js';
import {
    campusGates,
    campusGatePiers,
    campusGateBars,
    campusGateLintels,
    campusTrees,
    campusGreenAreas,
    campusSurfaces,
    campusDetailStructures,
    campusCafeFurniture,
    campusRoofDetails,
    campusLandmarkLabels,
    campusAddedBuildings,
    campusFacadeDetails,
    campusStairs,
    campusCrosswalks,
    campusCanopies,
    campusAccessibility,
    CAMPUS_FLOOR_HEIGHT_METERS
} from './campusDetails.js';

// Let Vite bundle the worker and its shared module into a deployable asset.
// A plain `?url` copies only the entry file and breaks the production map.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

const campusBuildings = {
    type: 'FeatureCollection',
    features: [...buildingsData.features, ...campusAddedBuildings.features]
};
const CAMPUS_BUILDINGS = campusBuildings.features.filter(f => f.properties.verified);

const OFFICIAL_PARKING = {
    'way/286086060': { parkingCode: 'P1', parkingName: 'Parqueo Biblioteca' },
    'way/1147031388': { parkingCode: 'P2', parkingName: 'Parqueo Crisantemos I' },
    'way/286086062': { parkingCode: 'P3', parkingName: 'Parqueo Crisantemos II' }
};

const campusParking = {
    type: 'FeatureCollection',
    features: campusFeatures.parking.features
        .filter(feature => OFFICIAL_PARKING[feature.properties.id])
        .map(feature => {
            let geom = feature.geometry;
            if (feature.properties.id === 'way/286086060' && geom.type === 'Polygon') {
                geom = {
                    ...geom,
                    coordinates: [
                        geom.coordinates[0].map(([lng, lat]) => [
                            Math.max(lng, -69.96148), // Cut off parking before it enters the library/plaza
                            lat
                        ])
                    ]
                };
            }
            return {
                ...feature,
                geometry: geom,
                properties: { ...feature.properties, ...OFFICIAL_PARKING[feature.properties.id] }
            };
        })
};

const campusContextParking = {
    type: 'FeatureCollection',
    features: campusFeatures.parking.features
        .filter(feature => !OFFICIAL_PARKING[feature.properties.id])
};

function buildingWallColor(isNight = false) {
    return [
        'match', ['get', 'code'],
        'AH', isNight ? '#DCE5E3' : '#EEF2F1',
        'EL', isNight ? '#DFE3E1' : '#F1F1ED',
        'FD', isNight ? '#C5AF78' : '#D8C28A',
        'GC', isNight ? '#999791' : '#B3B1AA',
        'Biblioteca', isNight ? '#A09E98' : '#B9B7B0',
        'EP', isNight ? '#B7B0A5' : '#C9C2B5',
        'DP', isNight ? '#B69A6F' : '#D4B37C',
        'ER', isNight ? '#D0D4CF' : '#E2E4E0',
        'PB', isNight ? '#D2D6D1' : '#E4E7E3',
        'AJ', isNight ? '#BE8D4E' : '#D4A45E',
        'LF', isNight ? '#D1C6B4' : '#E6DDCC',
        isNight ? '#CBC6BD' : '#DDD8CE'
    ];
}

function buildingRoofColor(isNight = false) {
    return [
        'match', ['get', 'code'],
        'AH', isNight ? '#C7D0CF' : '#D9E1E0',
        'EL', isNight ? '#C7CCCB' : '#D8DBDA',
        'FD', isNight ? '#908D86' : '#AAA79F',
        'GC', isNight ? '#817F7A' : '#999791',
        'Biblioteca', isNight ? '#85837E' : '#A09E98',
        'EP', isNight ? '#918C84' : '#ACA69D',
        'DP', isNight ? '#9F865F' : '#B99B6A',
        'ER', isNight ? '#B8BDB9' : '#CDD1CC',
        'PB', isNight ? '#BDC2BD' : '#D1D5D0',
        'AJ', isNight ? '#986A39' : '#B78448',
        'LF', isNight ? '#ADA494' : '#C9C0B1',
        isNight ? '#AAA59D' : '#C5C0B7'
    ];
}

// El extracto OSM local también contiene calles y senderos del vecindario.
// Conservamos únicamente los recorridos que cruzan el perímetro del campus.
const INTERNAL_PATH_IDS = new Set([
    'way/469961092', 'way/469961093', 'way/469961094', 'way/469961095',
    'way/469961096', 'way/469961097', 'way/469961098', 'way/469961099',
    'way/469961100', 'way/469961101', 'way/713456603',
    'way/1010912607', 'way/1010912608', 'way/1010912609', 'way/1010912610',
    'way/1010912611', 'way/1010912612', 'way/1010912613', 'way/1010912614',
    'way/1010912615', 'way/1010912616', 'way/1010912617', 'way/1010912618'
]);

const campusInternalPaths = {
    type: 'FeatureCollection',
    features: campusFeatures.paths.features
        .filter(feature => INTERNAL_PATH_IDS.has(feature.properties.id))
        .map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                pathClass: feature.properties.highway === 'service' ? 'service' : 'pedestrian'
            }
        }))
};

const campusPlazas = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: { id: 'plaza-principal', name: 'Plazoleta Principal' },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-69.96236, 18.48781], [-69.96221, 18.48781],
                    [-69.96220, 18.48782], [-69.96204, 18.48782],
                    [-69.96204, 18.48796], [-69.96212, 18.48800],
                    [-69.96225, 18.48800], [-69.96237, 18.48794],
                    [-69.96236, 18.48781]
                ]]
            }
        }
    ]
};

const campusFurniture = {
    type: 'FeatureCollection',
    features: [
        [[-69.96231, 18.48775], [-69.96224, 18.48775]],
        [[-69.96218, 18.48784], [-69.96211, 18.48783]],
        [[-69.96408, 18.48768], [-69.96402, 18.48769]],
        [[-69.96390, 18.48776], [-69.96384, 18.48775]]
    ].map((coordinates, index) => ({
        type: 'Feature',
        properties: { id: `bench-${index + 1}` },
        geometry: { type: 'LineString', coordinates }
    }))
};

const campusPois = {
    type: 'FeatureCollection',
    features: campusFeatures.pois.features.map(feature => {
        const next = JSON.parse(JSON.stringify(feature));
        const type = next.properties.type;
        if (type === 'cafeteria') {
            next.properties.name = 'Café Santo Domingo';
            next.geometry.coordinates = [-69.96262, 18.48799];
        } else if (type === 'plaza' && next.properties.name === 'Plazoleta Principal') {
            next.geometry.coordinates = [-69.96220, 18.48790];
        } else if (type === 'plaza') {
            next.properties.name = 'Plazoleta Oeste';
            next.geometry.coordinates = [-69.96368, 18.48778];
        } else if (type === 'shop') {
            next.geometry.coordinates = [-69.96211, 18.48780];
        } else if (type === 'clinic') {
            next.geometry.coordinates = [-69.96383, 18.48738];
        } else if (type === 'amenity' && next.properties.name === 'Domo Estudiantil') {
            next.geometry.coordinates = [-69.96102, 18.48770];
        } else if (type === 'food') {
            next.properties.name = 'Food court EL';
            next.geometry.coordinates = [-69.96245, 18.48788];
        }
        return next;
    })
};

const boundaryGeometry = campusFeatures.boundary.features[0].geometry;
const boundaryRing = boundaryGeometry.type === 'MultiPolygon'
    ? boundaryGeometry.coordinates[0][0]
    : boundaryGeometry.coordinates[0];
const campusExteriorMask = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: { role: 'exterior-mask' },
        geometry: {
            type: 'Polygon',
            coordinates: [
                [[-180, -80], [180, -80], [180, 80], [-180, 80], [-180, -80]],
                [...boundaryRing].reverse()
            ]
        }
    }]
};

function createMapPattern(map, id, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    draw(context, canvas.width, canvas.height);
    map.addImage(id, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: 2 });
}

// Pre-compute centroids for parking labels
function computeCentroids(featureCollection) {
    return {
        type: 'FeatureCollection',
        features: featureCollection.features
            .filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
            .map(f => {
                const ring = f.geometry.type === 'MultiPolygon'
                    ? f.geometry.coordinates[0][0]
                    : f.geometry.coordinates[0];
                const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
                const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                    properties: f.properties
                };
            })
    };
}

function isPointInsidePolygon([x, y], ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const crosses = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (crosses) inside = !inside;
    }
    return inside;
}

function getOverviewCamera(containerWidth = window.innerWidth) {
    // La maqueta vive dentro de una tarjeta lateral; la cámara debe responder
    // al ancho real del mapa y no al ancho completo de la ventana.
    if (containerWidth <= 420) {
        return { center: [-69.96238, 18.48772], zoom: 16.95, pitch: 43, bearing: -8 };
    }
    if (containerWidth <= 700) {
        return { center: [-69.96225, 18.48772], zoom: 17.12, pitch: 46, bearing: -9 };
    }
    const viewportWidth = containerWidth;
    if (viewportWidth >= 1900) {
        return { center: [-69.96232, 18.48770], zoom: 18.20, pitch: 50, bearing: -10 };
    }
    if (viewportWidth >= 1500) {
        return { center: [-69.96240, 18.48770], zoom: 18.06, pitch: 51, bearing: -10 };
    }
    if (viewportWidth <= 900) {
        return { center: [-69.96228, 18.48770], zoom: 17.35, pitch: 46, bearing: -10 };
    }
    return { center: [-69.96250, 18.48770], zoom: 17.86, pitch: 52, bearing: -10 };
}

function getFocusedCamera(presetId, containerWidth, compact) {
    const preset = cameraPresets[presetId];
    if (!preset) return null;

    // En una tarjeta angosta, el acercamiento original de 18.8 recortaba
    // demasiado el edificio. Conservamos el volumen 3D y el contexto cercano.
    if (!compact) return preset;
    if (containerWidth <= 420) {
        return { ...preset, zoom: Math.min(preset.zoom || 17, 18.18), pitch: Math.min(preset.pitch ?? 52, 50) };
    }
    return { ...preset, zoom: Math.min(preset.zoom || 17, 18.48), pitch: Math.min(preset.pitch ?? 52, 55) };
}

function moveCamera(map, camera, compact) {
    if (!camera) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || document.documentElement.dataset.reduceMotion === 'true';
    const options = {
        center: camera.center,
        zoom: camera.zoom || 17,
        pitch: camera.pitch ?? 52,
        bearing: camera.bearing ?? -10,
        duration: compact ? 620 : 820,
        speed: 1.05,
        curve: 1.2,
        essential: true
    };
    map.stop();
    prefersReducedMotion ? map.jumpTo(options) : map.flyTo(options);
}

export function initCampusMap(containerId, options = {}) {
    const container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;
    const overviewCamera = getOverviewCamera(container?.clientWidth || window.innerWidth);
    const map = new maplibregl.Map({
        container: containerId,
        style: {
            version: 8,
            glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
            sources: {},
            light: {
                // Tropical daylight: strong sun from southeast at ~40° elevation
                // Creates clear directional shadows on building faces
                anchor: 'map',
                color: '#FFF8F0',      // warm white (tropical sun has slight amber)
                intensity: 0.65,       // stronger than before (was 0.4)
                position: [1.5, 210, 40]  // azimuth 210°=SSW, 40° altitude
            },
            layers: [
                {
                    id: 'background',
                    type: 'background',
                    paint: { 'background-color': '#EEF3EA' }
                }
            ]
        },
        center: overviewCamera.center,
        zoom: overviewCamera.zoom,
        pitch: overviewCamera.pitch,
        bearing: overviewCamera.bearing,
        interactive: true,
        attributionControl: false,
        dragRotate: !options.compact,
        scrollZoom: !options.compact,
        maxBounds: [[-69.9685, 18.4830], [-69.9560, 18.4930]],
        minZoom: 15,
        maxZoom: 20
    });

    map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }), 'bottom-left');

    map.on('load', () => {

        createMapPattern(map, 'parking-bays-pattern', (context, width, height) => {
            // Diagonal bay stripes — light lines on dark asphalt
            context.clearRect(0, 0, width, height);
            context.strokeStyle = 'rgba(255,255,255,0.65)';
            context.lineWidth = 1.8;
            for (let x = -height; x < width + height; x += 10) {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x + height, height);
                context.stroke();
            }
        });
        createMapPattern(map, 'plaza-concrete-pattern', (context, width, height) => {
            // Gray concrete slab grid — realistic plazoleta appearance
            context.fillStyle = '#C0BCBA';
            context.fillRect(0, 0, width, height);
            context.strokeStyle = 'rgba(155,150,148,0.75)';
            context.lineWidth = 0.8;
            // Horizontal grout lines
            for (let y = 8; y < height; y += 8) {
                context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
            }
            // Vertical grout lines
            for (let x = 8; x < width; x += 8) {
                context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
            }
        });
        createMapPattern(map, 'plaza-paver-pattern', (context, width, height) => {
            context.fillStyle = 'rgba(120,110,100,0.15)';
            context.beginPath();
            context.arc(width / 2, height / 2, 1.5, 0, Math.PI * 2);
            context.fill();
        });
        createMapPattern(map, 'cafe-deck-pattern', (context, width, height) => {
            context.fillStyle = '#C99662';
            context.fillRect(0, 0, width, height);
            context.strokeStyle = 'rgba(104,63,31,0.34)';
            context.lineWidth = 1.4;
            for (let y = 4; y < height; y += 7) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(width, y);
                context.stroke();
            }
        });
        createMapPattern(map, 'gravel-pattern', (context, width, height) => {
            // Light sandy/gravel texture for unpaved parking
            context.fillStyle = '#C4BEB6';
            context.fillRect(0, 0, width, height);
            // Random dots for gravel feel
            context.fillStyle = 'rgba(180,170,160,0.5)';
            [[3,2],[8,6],[14,11],[18,4],[5,14],[12,18],[20,15],[7,20],[16,8],[10,3]].forEach(([x,y]) => {
                context.beginPath(); context.arc(x, y, 1, 0, Math.PI*2); context.fill();
            });
        });

        // Contexto urbano de baja jerarquía. Son huellas y vías del extracto
        // OSM local; no inferimos alturas, fachadas ni usos de los edificios.
        map.addSource('campus-context-greenery', { type: 'geojson', data: campusFeatures.greenery });
        map.addLayer({
            id: 'campus-context-greenery',
            type: 'fill',
            source: 'campus-context-greenery',
            paint: {
                'fill-color': '#D5E5CE',
                'fill-opacity': 0.72,
                'fill-outline-color': '#C6D8BE'
            }
        });

        map.addSource('campus-context-parking', { type: 'geojson', data: campusContextParking });
        map.addLayer({
            id: 'campus-context-parking',
            type: 'fill',
            source: 'campus-context-parking',
            paint: { 'fill-color': '#E5E2DC', 'fill-opacity': 0.78 }
        });
        map.addLayer({
            id: 'campus-context-parking-outline',
            type: 'line',
            source: 'campus-context-parking',
            paint: { 'line-color': '#D5D1CA', 'line-width': 1, 'line-opacity': 0.8 }
        });

        map.addSource('campus-context-buildings', { type: 'geojson', data: campusContextBuildings });
        map.addLayer({
            id: 'campus-context-buildings',
            type: 'fill',
            source: 'campus-context-buildings',
            paint: { 'fill-color': '#E3E1DD', 'fill-opacity': 0.88 }
        });
        map.addLayer({
            id: 'campus-context-building-outlines',
            type: 'line',
            source: 'campus-context-buildings',
            paint: { 'line-color': '#D4D1CC', 'line-width': 1, 'line-opacity': 0.82 }
        });

        map.addSource('campus-context-roads', { type: 'geojson', data: campusContextRoads });
        map.addLayer({
            id: 'campus-context-roads-underlay',
            type: 'line',
            source: 'campus-context-roads',
            paint: {
                'line-color': '#CDD3D6',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['match', ['get', 'roadClass'], 'major', 8, 'street', 4.5, 'service', 3.2, 2],
                    19, ['match', ['get', 'roadClass'], 'major', 18, 'street', 10, 'service', 7, 4]
                ],
                'line-opacity': ['match', ['get', 'roadClass'], 'path', 0.45, 0.82]
            }
        });
        map.addLayer({
            id: 'campus-context-roads-surface',
            type: 'line',
            source: 'campus-context-roads',
            paint: {
                'line-color': '#F8F8F6',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['match', ['get', 'roadClass'], 'major', 5.5, 'street', 2.7, 'service', 1.8, 1],
                    19, ['match', ['get', 'roadClass'], 'major', 14, 'street', 7, 'service', 4.5, 2.2]
                ],
                'line-opacity': ['match', ['get', 'roadClass'], 'path', 0.55, 0.96]
            }
        });

        map.addSource('campus-context-trees', { type: 'geojson', data: campusFeatures.trees });
        map.addLayer({
            id: 'campus-context-trees',
            type: 'circle',
            source: 'campus-context-trees',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 16, 1.4, 19, 3.1],
                'circle-color': '#9EBB91',
                'circle-stroke-color': '#839F78',
                'circle-stroke-width': 0.65,
                'circle-opacity': 0.72
            }
        });

        // ════════════════════════════════════════
        // CAPA 0: SUELO DEL CAMPUS (boundary fill)
        // ════════════════════════════════════════
        map.addSource('campus-boundary', { type: 'geojson', data: campusFeatures.boundary });

        map.addLayer({
            id: 'campus-boundary-shadow',
            type: 'line',
            source: 'campus-boundary',
            paint: {
                'line-color': '#6F6A62',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 8, 19, 16],
                'line-blur': 7,
                'line-opacity': 0.12,
                'line-translate': [2, 4]
            }
        });

        map.addLayer({
            id: 'campus-ground',
            type: 'fill',
            source: 'campus-boundary',
            paint: { 'fill-color': '#F2EDE4', 'fill-opacity': 1 }
        });

        // Borde punteado del campus
        map.addLayer({
            id: 'campus-boundary-line',
            type: 'line',
            source: 'campus-boundary',
            paint: {
                'line-color': '#D1BFA8',
                'line-width': 2.5,
                'line-dasharray': [4, 3]
            }
        });

        // ════════════════════════════════════════
        // CAPA 1: CAMINOS INTERNOS (antes de edificios)
        // ════════════════════════════════════════
        map.addSource('campus-paths', { type: 'geojson', data: campusInternalPaths });
        // Outer glow (shadow) for visual depth
        map.addLayer({
            id: 'campus-paths-glow',
            type: 'line',
            source: 'campus-paths',
            paint: {
                'line-color': '#B8A898',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['case', ['==', ['get', 'pathClass'], 'service'], 5, 3],
                    18, ['case', ['==', ['get', 'pathClass'], 'service'], 10, 6],
                    20, ['case', ['==', ['get', 'pathClass'], 'service'], 17, 11]
                ],
                'line-opacity': 0.35,
                'line-blur': 3
            }
        });
        // Asphalt/concrete surface (darker for contrast)
        map.addLayer({
            id: 'campus-paths-bg',
            type: 'line',
            source: 'campus-paths',
            paint: {
                'line-color': '#A89E92',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['case', ['==', ['get', 'pathClass'], 'service'], 4, 2.4],
                    18, ['case', ['==', ['get', 'pathClass'], 'service'], 9, 5.2],
                    20, ['case', ['==', ['get', 'pathClass'], 'service'], 16, 10]
                ],
                'line-opacity': 1
            }
        });
        // Center highlight (brighter for contrast)
        map.addLayer({
            id: 'campus-paths-fg',
            type: 'line',
            source: 'campus-paths',
            paint: {
                'line-color': '#F4F0EB',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['case', ['==', ['get', 'pathClass'], 'service'], 2, 1.2],
                    18, ['case', ['==', ['get', 'pathClass'], 'service'], 5, 2.8],
                    20, ['case', ['==', ['get', 'pathClass'], 'service'], 10, 6]
                ],
                'line-opacity': 0.95
            }
        });

        // ════════════════════════════════════════
        // CAPA 2: ÁREAS VERDES
        // ════════════════════════════════════════
        map.addSource('campus-green', { type: 'geojson', data: campusGreenAreas });
        map.addLayer({
            id: 'campus-green-fill',
            type: 'fill',
            source: 'campus-green',
            paint: {
                'fill-color': [
                    'match', ['get', 'kind'],
                    'forest', '#9FC47D',
                    'forest-border', '#9FC47D',
                    'garden', '#BBD69B',
                    '#C9DDB0'
                ],
                'fill-opacity': 0.92
            }
        });
        map.addLayer({
            id: 'campus-green-outline',
            type: 'line',
            source: 'campus-green',
            paint: { 'line-color': '#8CAF72', 'line-width': 1.15 }
        });

        // Copas simplificadas: ayudan a leer la escala y respetan las zonas
        // verdes verificadas en lugar de repartirse uniformemente por el plano.
        map.addSource('campus-trees', { type: 'geojson', data: campusTrees });
        map.addLayer({
            id: 'campus-tree-shadows',
            type: 'circle',
            source: 'campus-trees',
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['*', ['get', 'size'], 3.0],
                    18, ['*', ['get', 'size'], 6.4],
                    20, ['*', ['get', 'size'], 10.5]
                ],
                'circle-color': 'rgba(45,55,39,0.2)',
                'circle-blur': 0.35,
                'circle-translate': [2, 3]
            }
        });
        map.addLayer({
            id: 'campus-tree-canopies',
            type: 'circle',
            source: 'campus-trees',
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    16, ['*', ['get', 'size'], ['match', ['get', 'kind'], 'shade', 3.7, 2.7]],
                    18, ['*', ['get', 'size'], ['match', ['get', 'kind'], 'shade', 7.1, 5.1]],
                    20, ['*', ['get', 'size'], ['match', ['get', 'kind'], 'shade', 11.5, 8.4]]
                ],
                'circle-color': [
                    'match', ['get', 'kind'],
                    'palm', '#6FA45F',
                    '#5E9651'
                ],
                'circle-stroke-color': '#477A3E',
                'circle-stroke-width': 0.8,
                'circle-opacity': 0.96
            }
        });

        // ════════════════════════════════════════
        // CAPA 3: PARQUEOS
        // ════════════════════════════════════════
        map.addSource('campus-parking', { type: 'geojson', data: campusParking });
        // Dark asphalt base
        map.addLayer({
            id: 'campus-parking-fill',
            type: 'fill',
            source: 'campus-parking',
            filter: ['!=', ['get', 'parking'], 'underground'],
            paint: { 'fill-color': '#B8B4AA', 'fill-opacity': 1 }  // darker asphalt tone
        });
        // Bay lines pattern (white dashes on dark surface)
        map.addLayer({
            id: 'campus-parking-lines',
            type: 'fill',
            source: 'campus-parking',
            filter: ['!=', ['get', 'parking'], 'underground'],
            paint: {
                'fill-pattern': 'parking-bays-pattern',
                'fill-opacity': ['interpolate', ['linear'], ['zoom'], 16, 0.5, 19, 1.0]
            }
        });
        // Bold outline
        map.addLayer({
            id: 'campus-parking-outline',
            type: 'line',
            source: 'campus-parking',
            filter: ['!=', ['get', 'parking'], 'underground'],
            paint: {
                'line-color': '#888078',
                'line-width': 1.8
            }
        });

        // P3 conserva el cruce peatonal central y las hileras de estacionamiento
        // visibles en las tomas satelitales oblicuas de 2026.
        map.addSource('campus-crosswalks', { type: 'geojson', data: campusCrosswalks });
        map.addLayer({
            id: 'campus-crosswalk-shadow',
            type: 'line',
            source: 'campus-crosswalks',
            paint: {
                'line-color': 'rgba(62,58,54,0.24)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 3.2, 19, 7.8],
                'line-dasharray': [0.55, 0.48],
                'line-translate': [1, 1]
            }
        });
        map.addLayer({
            id: 'campus-crosswalk-stripes',
            type: 'line',
            source: 'campus-crosswalks',
            paint: {
                'line-color': '#F7F5EF',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2.4, 19, 6.2],
                'line-dasharray': [0.55, 0.48],
                'line-opacity': 0.96
            }
        });
        // P2 tiene niveles soterrados, pero la vista satelital confirma una
        // cubierta/deck superior con plazas visibles. Se conserva la lectura de
        // volumen subterráneo y se añade la trama ligera de su superficie.
        map.addLayer({
            id: 'campus-parking-underground-fill',
            type: 'fill',
            source: 'campus-parking',
            filter: ['==', ['get', 'parking'], 'underground'],
            paint: { 'fill-color': '#C4C0B7', 'fill-opacity': 0.72 }
        });
        map.addLayer({
            id: 'campus-parking-underground-deck-lines',
            type: 'fill',
            source: 'campus-parking',
            filter: ['==', ['get', 'parking'], 'underground'],
            paint: {
                'fill-pattern': 'parking-bays-pattern',
                'fill-opacity': ['interpolate', ['linear'], ['zoom'], 16, 0.28, 19, 0.62]
            }
        });
        map.addLayer({
            id: 'campus-parking-underground-outline',
            type: 'line',
            source: 'campus-parking',
            filter: ['==', ['get', 'parking'], 'underground'],
            paint: {
                'line-color': '#A69D90',
                'line-width': 1.2,
                'line-dasharray': [3, 2],
                'line-opacity': 0.72
            }
        });

        // ════════════════════════════════════════
        // CAPA 4: PLAZOLETA (gray concrete)
        // ════════════════════════════════════════
        // Plazoleta Principal
        map.addSource('campus-plazas', { type: 'geojson', data: campusPlazas });
        // Gray concrete base — realistic plazoleta
        map.addLayer({
            id: 'campus-plaza-fill',
            type: 'fill',
            source: 'campus-plazas',
            paint: { 'fill-color': '#C2BDB8', 'fill-opacity': 1 }
        });
        // Concrete slab grid pattern
        map.addLayer({
            id: 'campus-plaza-pavers',
            type: 'fill',
            source: 'campus-plazas',
            paint: { 'fill-pattern': 'plaza-concrete-pattern', 'fill-opacity': 0.92 }
        });
        map.addLayer({
            id: 'campus-plaza-outline',
            type: 'line',
            source: 'campus-plazas',
            paint: { 'line-color': '#9E9892', 'line-width': 1.2 }
        });

        // ── Covered walkways/corridors (colonnaded passages inside campus) ──
        const coveredWalkwaysData = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { kind: 'corridor' }, geometry: { type: 'LineString', coordinates: [[-69.9635243, 18.4877201], [-69.9633544, 18.4877249]] } },
                { type: 'Feature', properties: { kind: 'corridor' }, geometry: { type: 'LineString', coordinates: [[-69.9630165, 18.4876594], [-69.9627727, 18.4876634]] } },
                { type: 'Feature', properties: { kind: 'corridor' }, geometry: { type: 'LineString', coordinates: [[-69.9627810, 18.4877226], [-69.9627727, 18.4876634], [-69.9626574, 18.4876699]] } },
                { type: 'Feature', properties: { kind: 'corridor' }, geometry: { type: 'LineString', coordinates: [[-69.9626046, 18.4876142], [-69.9626096, 18.4876649]] } }
            ]
        };
        map.addSource('campus-corridors', { type: 'geojson', data: coveredWalkwaysData });
        map.addLayer({
            id: 'campus-corridors-roof',
            type: 'line',
            source: 'campus-corridors',
            paint: {
                'line-color': '#D4D0C8',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 4, 19, 9],
                'line-opacity': 0.85
            }
        });
        map.addLayer({
            id: 'campus-corridors-center',
            type: 'line',
            source: 'campus-corridors',
            paint: {
                'line-color': '#E8E4DC',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1.5, 19, 4],
                'line-dasharray': [2, 1.5],
                'line-opacity': 0.7
            }
        });


        map.addSource('campus-surfaces', { type: 'geojson', data: campusSurfaces });
        map.addLayer({
            id: 'campus-surface-base',
            type: 'fill',
            source: 'campus-surfaces',
            paint: {
                'fill-color': [
                    'match', ['get', 'material'],
                    'terrace', '#D8D4CC',
                    'terracotta', '#B98269',
                    '#C99662'
                ],
                'fill-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-cafe-deck',
            type: 'fill',
            source: 'campus-surfaces',
            filter: ['==', ['get', 'material'], 'wood'],
            paint: { 'fill-pattern': 'cafe-deck-pattern', 'fill-opacity': 0.94 }
        });
        map.addLayer({
            id: 'campus-surface-outline',
            type: 'line',
            source: 'campus-surfaces',
            paint: { 'line-color': '#A88969', 'line-width': 1.3 }
        });

        // Rampas y bandas táctiles — tonos más sutiles, sin saturación
        map.addSource('campus-accessibility', { type: 'geojson', data: campusAccessibility });
        map.addLayer({
            id: 'campus-accessibility-fill',
            type: 'fill',
            source: 'campus-accessibility',
            paint: {
                'fill-color': [
                    'match', ['get', 'material'],
                    'tactile-yellow', '#DFC080',  // muted gold instead of bright yellow
                    '#7DA8C8'                      // muted blue instead of vivid
                ],
                'fill-opacity': 0.7
            }
        });
        map.addLayer({
            id: 'campus-accessibility-outline',
            type: 'line',
            source: 'campus-accessibility',
            paint: { 'line-color': '#F7F7F5', 'line-width': 0.7 }
        });

        // Escalinata de Biblioteca: seis líneas de peldaños entre plaza y fachada.
        map.addSource('campus-stairs', { type: 'geojson', data: campusStairs });
        map.addLayer({
            id: 'campus-stairs-shadow',
            type: 'line',
            source: 'campus-stairs',
            paint: { 'line-color': '#8E8981', 'line-width': 2.2, 'line-opacity': 0.55 }
        });
        map.addLayer({
            id: 'campus-stairs-treads',
            type: 'line',
            source: 'campus-stairs',
            paint: { 'line-color': '#F3F0EA', 'line-width': 1.05 }
        });

        map.addSource('campus-furniture', { type: 'geojson', data: campusFurniture });
        map.addLayer({
            id: 'campus-benches-shadow',
            type: 'line',
            source: 'campus-furniture',
            paint: { 'line-color': 'rgba(60,45,30,0.22)', 'line-width': 5, 'line-translate': [1, 2] }
        });
        map.addLayer({
            id: 'campus-benches',
            type: 'line',
            source: 'campus-furniture',
            paint: { 'line-color': '#7B5836', 'line-width': 3 }
        });

        // Mesas confirmadas en la terraza del Café Santo Domingo. El resto del
        // mobiliario manual permanece fuera hasta tener una posición trazable.
        map.addSource('campus-cafe-furniture', { type: 'geojson', data: campusCafeFurniture });
        map.addLayer({
            id: 'campus-cafe-table-shadows',
            type: 'circle',
            source: 'campus-cafe-furniture',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 17, 2.2, 20, 5],
                'circle-color': 'rgba(44,36,31,0.22)',
                'circle-translate': [1, 2]
            }
        });
        map.addLayer({
            id: 'campus-cafe-tables',
            type: 'circle',
            source: 'campus-cafe-furniture',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 17, 1.4, 20, 3.4],
                'circle-color': '#4B3B32',
                'circle-stroke-color': '#D5B790',
                'circle-stroke-width': 0.8
            }
        });

        // Volumen estilizado del Café Santo Domingo, situado según el plano oficial.
        map.addSource('campus-detail-structures', { type: 'geojson', data: campusDetailStructures });
        map.addLayer({
            id: 'campus-detail-structure-shadow',
            type: 'fill',
            source: 'campus-detail-structures',
            filter: ['==', ['get', 'id'], 'cafe-glass-shell'],
            paint: { 'fill-color': 'rgba(0,0,0,0.2)', 'fill-translate': [3, 4] }
        });
        map.addLayer({
            id: 'campus-detail-structures-3d',
            type: 'fill-extrusion',
            source: 'campus-detail-structures',
            paint: {
                'fill-extrusion-color': [
                    'match', ['get', 'material'],
                    'brand-red', '#C51E36',
                    'cafe-glass', '#78999B',
                    'cafe-interior', '#A86F4A',
                    'awning', '#3E4B4C',
                    'cafe-white', '#F7F4EF',
                    '#D3CEC5'
                ],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['coalesce', ['get', 'base'], 0],
                'fill-extrusion-opacity': 0.96,
                'fill-extrusion-vertical-gradient': true
            }
        });

        // Velo blanco: el entorno orienta sin competir con la maqueta del campus.
        // Las puertas se dibujan después para que continúen visibles sobre el borde.
        map.addSource('campus-exterior-mask', { type: 'geojson', data: campusExteriorMask });
        map.addLayer({
            id: 'campus-exterior-mask',
            type: 'fill',
            source: 'campus-exterior-mask',
            paint: { 'fill-color': '#FFFFFF', 'fill-opacity': 0.34 }
        });

        map.addLayer({
            id: 'campus-context-road-labels',
            type: 'symbol',
            source: 'campus-context-roads',
            minzoom: 16.8,
            filter: ['==', ['get', 'showLabel'], true],
            layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 1400,
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16.8, 9, 19, 11.5],
                'text-letter-spacing': 0.03,
                'text-max-angle': 35,
                'text-allow-overlap': false
            },
            paint: {
                'text-color': '#96938E',
                'text-halo-color': 'rgba(255,255,255,0.96)',
                'text-halo-width': 1.6,
                'text-opacity': 0.78
            }
        });

        // Cerca perimetral: zócalo claro y metal verde como en los accesos fotografiados.
        map.addLayer({
            id: 'campus-fence-base',
            type: 'line',
            source: 'campus-boundary',
            paint: {
                'line-color': '#C8C4BA',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2.6, 19, 5],
                'line-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-fence-metal',
            type: 'line',
            source: 'campus-boundary',
            paint: {
                'line-color': '#3F594D',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1.1, 19, 2.3],
                'line-dasharray': [1.25, 0.75],
                'line-opacity': 0.96
            }
        });

        // ════════════════════════════════════════
        // CAPA 6: PUERTAS / ENTRADAS DEL CAMPUS
        // ════════════════════════════════════════
        map.addSource('campus-gates', { type: 'geojson', data: campusGates });
        map.addSource('campus-gate-piers', { type: 'geojson', data: campusGatePiers });
        map.addSource('campus-gate-bars', { type: 'geojson', data: campusGateBars });
        map.addSource('campus-gate-lintels', { type: 'geojson', data: campusGateLintels });

        // Abre visualmente la cerca en cada acceso antes de dibujar su reja.
        map.addLayer({
            id: 'campus-gate-openings',
            type: 'line',
            source: 'campus-gate-bars',
            paint: {
                'line-color': '#F2EDE4',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 4.5, 19, 9]
            }
        });

        map.addLayer({
            id: 'campus-gate-piers-shadow',
            type: 'fill',
            source: 'campus-gate-piers',
            paint: { 'fill-color': 'rgba(46,43,39,0.22)', 'fill-translate': [2, 3] }
        });
        map.addLayer({
            id: 'campus-gate-piers-3d',
            type: 'fill-extrusion',
            source: 'campus-gate-piers',
            paint: {
                'fill-extrusion-color': '#B9B6AE',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-gate-lintels-3d',
            type: 'fill-extrusion',
            source: 'campus-gate-lintels',
            paint: {
                'fill-extrusion-color': '#B9B6AE',
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-gate-bars-underlay',
            type: 'line',
            source: 'campus-gate-bars',
            paint: {
                'line-color': '#263B35',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 3, 19, 6]
            }
        });
        map.addLayer({
            id: 'campus-gate-bars',
            type: 'line',
            source: 'campus-gate-bars',
            paint: {
                'line-color': '#597467',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1, 19, 2.2],
                'line-dasharray': [0.6, 0.5]
            }
        });

        map.addLayer({
            id: 'campus-gates-circle',
            type: 'circle',
            source: 'campus-gates',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 16, 3.5, 18, 6.5],
                'circle-color': '#344D43',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1.6
            }
        });
        // Gate label
        map.addLayer({
            id: 'campus-gates-label',
            type: 'symbol',
            source: 'campus-gates',
            minzoom: 16.65,
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8, 19, 10.5],
                'text-offset': [0, 1.25],
                'text-anchor': 'top',
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#A91833',
                'text-halo-color': 'rgba(255,255,255,0.95)',
                'text-halo-width': 2
            }
        });

        // ════════════════════════════════════════
        // CAPA 7: LABELS PARQUEOS, ZONAS VERDES & POIs
        // ════════════════════════════════════════

        // Parking centroids with official names
        const parkingCentroids = computeCentroids(campusParking);
        map.addSource('campus-parking-labels', { type: 'geojson', data: parkingCentroids });
        map.addLayer({
            id: 'campus-parking-P',
            type: 'symbol',
            source: 'campus-parking-labels',
            layout: {
                'text-field': ['concat', ['get', 'parkingCode'], '\n', ['get', 'parkingName']],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8.5, 19, 11],
                'text-line-height': 1.1,
                'text-max-width': 10,
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#514C45',
                'text-halo-color': 'rgba(244,242,238,0.96)',
                'text-halo-width': 2
            }
        });

        // POIs (cafetería, plazoleta, domo, etc.)
        map.addSource('campus-pois', { type: 'geojson', data: campusPois });
        map.addLayer({
            id: 'campus-poi-halos',
            type: 'circle',
            source: 'campus-pois',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 16, 3, 19, 7],
                'circle-color': [
                    'match', ['get', 'type'],
                    'cafeteria', '#7A4A2C',
                    'plaza', '#BF8B3D',
                    'clinic', '#A91833',
                    'shop', '#4A667A',
                    'food', '#B46534',
                    '#7D776E'
                ],
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 1.5
            }
        });
        map.addLayer({
            id: 'campus-poi-labels',
            type: 'symbol',
            source: 'campus-pois',
            filter: ['all', ['!=', ['get', 'type'], 'cafeteria'], ['!=', ['get', 'type'], 'plaza']],
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8, 19, 10],
                'text-offset': [0, 1.4],
                'text-anchor': 'top',
                'text-max-width': 8,
                'text-allow-overlap': false
            },
            paint: {
                'text-color': '#39342E',
                'text-halo-color': 'rgba(255,255,255,0.96)',
                'text-halo-width': 2
            }
        });
        map.addLayer({
            id: 'campus-key-poi-labels',
            type: 'symbol',
            source: 'campus-pois',
            // La cafetería tiene una etiqueta superior propia; repetirla aquí
            // superponía dos textos al enfocar FD en tarjetas angostas.
            filter: ['==', ['get', 'type'], 'plaza'],
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8, 19, 10],
                'text-offset': [0, 1.4],
                'text-anchor': 'top',
                'text-max-width': 9,
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#39342E',
                'text-halo-color': 'rgba(255,255,255,0.98)',
                'text-halo-width': 2
            }
        });

        // Green area names
        const greenLabels = computeCentroids({
            type: 'FeatureCollection',
            features: campusGreenAreas.features.filter(f => f.properties.name)
        });
        greenLabels.features = greenLabels.features.filter(feature =>
            isPointInsidePolygon(feature.geometry.coordinates, boundaryRing)
        );
        if (greenLabels.features.length > 0) {
            map.addSource('campus-green-labels', { type: 'geojson', data: greenLabels });
            map.addLayer({
                id: 'campus-green-names',
                type: 'symbol',
                source: 'campus-green-labels',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Regular'],
                    'text-size': 9,
                    'text-max-width': 9,
                    'text-allow-overlap': false
                },
                paint: {
                    'text-color': '#2E5A20',
                    'text-halo-color': 'rgba(184,212,149,0.9)',
                    'text-halo-width': 1.5
                }
            });
        }

        // ════════════════════════════════════════
        // EDIFICIOS (encima del suelo)
        // ════════════════════════════════════════
        map.addSource('campus', {
            type: 'geojson',
            data: campusBuildings,
            promoteId: 'numericId'
        });

        // Sombra — offset toward NNE to match SSW sun direction
        map.addLayer({
            id: 'buildings-shadow',
            type: 'fill',
            source: 'campus',
            paint: {
                // Shadow translate matches light direction (sun from SSW → shadow to NNE)
                'fill-color': 'rgba(0,0,0,0.18)',
                'fill-translate': [8, -5],
                'fill-opacity': 0.7
            }
        });

        // Base (planta baja)
        map.addLayer({
            id: 'buildings-base',
            type: 'fill',
            source: 'campus',
            paint: {
                'fill-color': buildingWallColor(false),
                'fill-opacity': 1
            }
        });

        // Extrusión 3D: familias de material observadas en las fotos oficiales.
        // La selección usa contorno/halo y no sustituye el color del edificio.
        map.addLayer({
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'campus',
            paint: {
                'fill-extrusion-color': buildingWallColor(false),
                // 3.5m per floor = realistic Dominican university construction
                // EP: 5 floors = 17.5m (tallest), EL: 5 floors = 17.5m
                // GC y FD: 4 floors = 14m, AH: 5 floors = 17.5m
                // Biblioteca: 3 floors = 10.5m (but wide footprint makes it dominant)
                'fill-extrusion-height': [
                    '*',
                    ['coalesce', ['get', 'levels'], 2],
                    CAMPUS_FLOOR_HEIGHT_METERS
                ],
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 1,
                'fill-extrusion-vertical-gradient': true,
                'fill-extrusion-color-transition': { duration: 400 }
            }
        });

        // Tapas de techo — coherentes con los colores de las paredes
        map.addLayer({
            id: 'building-roof-caps',
            type: 'fill-extrusion',
            source: 'campus',
            paint: {
                'fill-extrusion-color': buildingRoofColor(false),
                'fill-extrusion-base': ['*', ['coalesce', ['get', 'levels'], 2], CAMPUS_FLOOR_HEIGHT_METERS],
                'fill-extrusion-height': ['+', ['*', ['coalesce', ['get', 'levels'], 2], CAMPUS_FLOOR_HEIGHT_METERS], 0.3],
                'fill-extrusion-opacity': 1,
                'fill-extrusion-vertical-gradient': true
            }
        });

        // Rasgos de fachada — murales y detalles más sutiles
        map.addSource('campus-facade-details', { type: 'geojson', data: campusFacadeDetails });
        map.addLayer({
            id: 'campus-facade-details-3d',
            type: 'fill-extrusion',
            source: 'campus-facade-details',
            paint: {
                'fill-extrusion-color': [
                    'match', ['get', 'material'],
                    'brand-red', '#C51E36',
                    'architectural-wine', '#842635',
                    'glass',     '#A8C8CA',   // muted glass, less vivid teal
                    'charcoal-band', '#596164',
                    'stair-red', '#B51F38',
                    'library-salmon', '#B77A70',
                    'mural-coral',   '#C86070',  // softer coral
                    'mural-magenta', '#B0446A',  // softer magenta
                    'mural-blue',    '#4898B8',  // softer blue
                    'mural-orange',  '#D77A42',
                    'mural-yellow',  '#E1B95C',
                    '#D7D2C9'
                ],
                'fill-extrusion-base': ['coalesce', ['get', 'base'], 0],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 0.96
            }
        });

        // Toldos tensados blancos frente a DP/LibrINTEC.
        map.addSource('campus-canopies', { type: 'geojson', data: campusCanopies });
        map.addLayer({
            id: 'campus-canopies-shadow',
            type: 'fill',
            source: 'campus-canopies',
            paint: { 'fill-color': 'rgba(52,46,40,0.18)', 'fill-translate': [2, 3] }
        });
        map.addLayer({
            id: 'campus-canopies-3d',
            type: 'fill-extrusion',
            source: 'campus-canopies',
            paint: {
                'fill-extrusion-color': '#FAFAF7',
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1
            }
        });

        // Paños solares confirmados por vistas satelitales y por el programa
        // Campus Sostenible: FD, GC, Biblioteca, DP, EP/MIPYMES y PB.
        map.addSource('campus-roof-details', { type: 'geojson', data: campusRoofDetails });
        map.addLayer({
            id: 'campus-solar-panels',
            type: 'fill-extrusion',
            source: 'campus-roof-details',
            filter: ['==', ['get', 'material'], 'solar'],
            paint: {
                'fill-extrusion-color': [
                    'match', ['get', 'buildingCode'],
                    'Biblioteca', '#264F61',
                    'EP', '#244B5E',
                    'PB', '#2C5566',
                    '#214C62'
                ],
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-solar-panel-lines',
            type: 'line',
            source: 'campus-roof-details',
            filter: ['==', ['get', 'material'], 'solar'],
            paint: { 'line-color': '#8BC0CF', 'line-width': 0.8, 'line-opacity': 0.9 }
        });

        map.addLayer({
            id: 'campus-rooftop-structures',
            type: 'fill-extrusion',
            source: 'campus-roof-details',
            filter: ['!=', ['get', 'material'], 'solar'],
            paint: {
                'fill-extrusion-color': [
                    'match', ['get', 'material'],
                    'roof-white', '#F1F2EF',
                    'roof-charcoal', '#4D5152',
                    '#D8D6D1'
                ],
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1
            }
        });

        // Halo de selección: conserva el material real del volumen.
        map.addLayer({
            id: 'building-selection-halo',
            type: 'line',
            source: 'campus',
            paint: {
                'line-color': '#B31734',
                'line-width': 7,
                'line-blur': 5,
                'line-opacity': [
                    'case', ['boolean', ['feature-state', 'active'], false], 0.42, 0
                ]
            }
        });

        // Outline de edificios
        map.addLayer({
            id: 'buildings-outline',
            type: 'line',
            source: 'campus',
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'active'], false], '#B31734', '#8F8A82'
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'active'], false], 3, 1
                ],
                'line-color-transition': { duration: 300 }
            }
        });

        // ════════════════════════════════════════
        // LABELS DE EDIFICIOS (siempre visibles)
        // ════════════════════════════════════════
        const labelSource = {
            type: 'FeatureCollection',
            features: CAMPUS_BUILDINGS
                .filter(f => f.properties.code && f.properties.centroid_lng)
                .map(f => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [f.properties.centroid_lng, f.properties.centroid_lat] },
                    properties: { code: f.properties.code, name: f.properties.name }
                }))
        };
        map.addSource('labels', { type: 'geojson', data: labelSource });

        map.addLayer({
            id: 'building-code-label',
            type: 'symbol',
            source: 'labels',
            layout: {
                'text-field': ['get', 'code'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8, 17.5, 10.5, 18.5, 12, 19.2, 13],
                'text-offset': [0, -0.3],
                'text-anchor': 'center',
                'text-allow-overlap': true,
                'text-ignore-placement': true
            },
            paint: {
                'text-color': '#1C1C1E',
                'text-halo-color': 'rgba(255,255,255,0.95)',
                'text-halo-width': 2
            }
        });

        map.addLayer({
            id: 'building-name-label',
            type: 'symbol',
            source: 'labels',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': 9,
                'text-offset': [0, 1.0],
                'text-anchor': 'top',
                'text-allow-overlap': false,
                'text-ignore-placement': false,
                'text-max-width': 9
            },
            paint: {
                'text-color': '#5A5A60',
                'text-halo-color': 'rgba(255,255,255,0.95)',
                'text-halo-width': 1.5,
                'text-opacity': ['interpolate', ['linear'], ['zoom'], 17.7, 0, 18.25, 0.12, 18.65, 0.88, 19, 1]
            }
        });

        map.addSource('campus-landmark-labels', { type: 'geojson', data: campusLandmarkLabels });
        map.addLayer({
            id: 'campus-landmark-labels',
            type: 'symbol',
            source: 'campus-landmark-labels',
            minzoom: 17.2,
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': 9,
                'text-offset': [0, 1.2],
                'text-anchor': 'top',
                'text-allow-overlap': false
            },
            paint: {
                'text-color': [
                    'match', ['get', 'scope'],
                    'context', '#667862',
                    '#4C463F'
                ],
                'text-halo-color': 'rgba(255,255,255,0.96)',
                'text-halo-width': 1.8
            }
        });

        // El café queda entre FD y GC; este rótulo permanece legible aunque la
        // perspectiva 3D oculte parcialmente su volumen desde el sur.
        map.addLayer({
            id: 'campus-cafe-label-top',
            type: 'symbol',
            source: 'campus-pois',
            minzoom: 16.7,
            filter: ['==', ['get', 'type'], 'cafeteria'],
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 17, 9, 19, 12],
                'text-variable-anchor': ['top', 'left', 'right', 'bottom'],
                'text-radial-offset': 0.9,
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#A90022',
                'text-halo-color': 'rgba(255,255,255,0.98)',
                'text-halo-width': 2.2
            }
        });

        // Lleva toda la estructura de accesos al frente de las extrusiones.
        // Antes sólo se movía el rótulo y los edificios podían tapar los pórticos.
        [
            'campus-gate-openings',
            'campus-gate-piers-shadow',
            'campus-gate-piers-3d',
            'campus-gate-lintels-3d',
            'campus-gate-bars-underlay',
            'campus-gate-bars',
            'campus-gates-circle',
            'campus-gates-label'
        ].forEach(layerId => map.moveLayer(layerId));

        // ── Interactividad: hover cursor ──
        map.on('mouseenter', 'buildings-3d', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'buildings-3d', () => { map.getCanvas().style.cursor = ''; });

        // ── Popup reutilizable ──
        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'campus-popup',
            maxWidth: '240px',
            offset: [0, -10]
        });

        // ── Click en edificio: popup con datos oficiales ──
        map.on('click', 'buildings-3d', (e) => {
            if (!e.features || e.features.length === 0) return;
            const props = e.features[0].properties;
            const code = props.code;

            if (code && window.enterFocusMode) window.enterFocusMode(code);

            // Build facilities list from JSON string
            let facilitiesList = '';
            try {
                const facs = typeof props.facilities === 'string'
                    ? JSON.parse(props.facilities)
                    : (props.facilities || []);
                if (facs.length > 0) {
                    facilitiesList = `<ul class="popup-facilities">${facs.slice(0, 5).map(f => `<li>${f}</li>`).join('')}${facs.length > 5 ? `<li class="popup-more">+${facs.length - 5} más...</li>` : ''}</ul>`;
                }
            } catch {}

            const html = `
                <div class="popup-header">
                    <span class="popup-code">${code || '—'}</span>
                    <span class="popup-name">${props.name || props.shortName || ''}</span>
                </div>
                ${facilitiesList}
            `;

            popup
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        });

        // ── Click en fondo → cerrar popup y salir de focus ──
        map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
            if (features.length === 0) {
                popup.remove();
                if (window.exitFocusMode) window.exitFocusMode();
            }
        });

        if (container) {
            container.dataset.loaded = 'true';
            container.dispatchEvent(new CustomEvent('campus-map-ready'));
        }
    });

    const resizeObserver = container && 'ResizeObserver' in window
        ? new ResizeObserver(() => map.resize())
        : null;
    resizeObserver?.observe(container);

    let currentActiveCode = null;

    const controller = {
        highlightBuilding: (code) => {
            const doHighlight = () => {
                if (currentActiveCode) {
                    CAMPUS_BUILDINGS
                        .filter(f => f.properties.code === currentActiveCode)
                        .forEach(prev => map.setFeatureState(
                            { source: 'campus', id: prev.properties.numericId },
                            { active: false }
                        ));
                }
                if (code) {
                    CAMPUS_BUILDINGS
                        .filter(f => f.properties.code === code)
                        .forEach(next => map.setFeatureState(
                            { source: 'campus', id: next.properties.numericId },
                            { active: true }
                        ));
                }
                currentActiveCode = code || null;
            };
            map.isStyleLoaded() ? doHighlight() : map.once('load', doHighlight);
        },

        setTheme: (themeId) => {
            if (!map.isStyleLoaded()) return;
            const isNight = themeId === 'night';
            // El campus conserva la mayor jerarquía; el contexto queda desaturado.
            map.setPaintProperty('background', 'background-color', isNight ? '#E5ECE3' : '#EEF3EA');
            map.setPaintProperty('campus-ground', 'fill-color', isNight ? '#E8E3DA' : '#F2EDE4');
            map.setPaintProperty('buildings-base', 'fill-color', buildingWallColor(isNight));
            map.setPaintProperty('buildings-3d', 'fill-extrusion-color', buildingWallColor(isNight));
            map.setPaintProperty('building-roof-caps', 'fill-extrusion-color', buildingRoofColor(isNight));
            map.setPaintProperty('campus-exterior-mask', 'fill-opacity', isNight ? 0.42 : 0.34);
        },

        focusCamera: (presetId) => {
            const camera = presetId === 'campus'
                ? getOverviewCamera(container?.clientWidth || window.innerWidth)
                : getFocusedCamera(presetId, container?.clientWidth || window.innerWidth, Boolean(options.compact));
            moveCamera(map, camera, Boolean(options.compact));
        },

        zoomBy: (amount) => {
            const nextZoom = Math.min(20, Math.max(15, map.getZoom() + amount));
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                || document.documentElement.dataset.reduceMotion === 'true';
            map.stop();
            prefersReducedMotion
                ? map.jumpTo({ zoom: nextZoom })
                : map.easeTo({ zoom: nextZoom, duration: 230, essential: true });
        },

        destroy: () => {
            resizeObserver?.disconnect();
            map.remove();
        }
    };

    return controller;
}
