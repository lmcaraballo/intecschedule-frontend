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
const BUILDING_PICK_LAYERS = [
    'active-building-name',
    'active-building-label',
    'building-name-label',
    'building-code-label',
    'campus-solar-panel-lines',
    'campus-solar-panels',
    'campus-rooftop-structures',
    'campus-facade-details-3d',
    'building-roof-caps',
    ...Array.from({ length: 5 }, (_, index) => `building-window-band-${index + 1}`),
    'buildings-3d',
    'buildings-base'
];

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

function buildingGlassColor(isNight = false) {
    return [
        'match', ['get', 'code'],
        'FD', isNight ? '#42666B' : '#5B7F83',
        'GC', isNight ? '#3E5F66' : '#56747A',
        'Biblioteca', isNight ? '#355B65' : '#4E737B',
        'EP', isNight ? '#46666B' : '#628086',
        'DP', isNight ? '#3F6268' : '#58777D',
        'AJ', isNight ? '#3D6068' : '#55747C',
        isNight ? '#4B6B70' : '#68878B'
    ];
}

const SELECTED_BUILDING_COLOR = '#D91F3D';

function selectedBuildingColor(defaultColor) {
    return [
        'case',
        ['boolean', ['feature-state', 'active'], false], SELECTED_BUILDING_COLOR,
        defaultColor
    ];
}

function selectedDetailColor(selectedCode, defaultColor) {
    if (!selectedCode) return defaultColor;
    return [
        'case',
        ['==', ['get', 'buildingCode'], selectedCode], SELECTED_BUILDING_COLOR,
        defaultColor
    ];
}

function facadeDetailColor(selectedCode = '') {
    return selectedDetailColor(selectedCode, [
        'match', ['get', 'material'],
        'brand-red', '#C51E36',
        'architectural-wine', '#842635',
        'glass', '#A8C8CA',
        'charcoal-band', '#596164',
        'stair-red', '#B51F38',
        'library-salmon', '#B77A70',
        'mural-coral', '#C86070',
        'mural-magenta', '#B0446A',
        'mural-blue', '#4898B8',
        'mural-orange', '#D77A42',
        'mural-yellow', '#E1B95C',
        '#D7D2C9'
    ]);
}

function solarPanelColor(selectedCode = '') {
    return selectedDetailColor(selectedCode, [
        'match', ['get', 'buildingCode'],
        'Biblioteca', '#264F61',
        'EP', '#244B5E',
        'PB', '#2C5566',
        '#214C62'
    ]);
}

function rooftopStructureColor(selectedCode = '') {
    return selectedDetailColor(selectedCode, [
        'match', ['get', 'material'],
        'roof-white', '#F1F2EF',
        'roof-charcoal', '#4D5152',
        '#D8D6D1'
    ]);
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
                pathClass: feature.properties.highway === 'service'
                    ? 'service'
                    : feature.properties.covered === 'yes'
                        ? 'covered'
                        : 'pedestrian'
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

function createMapPattern(map, id, draw, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    draw(context, canvas.width, canvas.height);
    map.addImage(id, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: 2 });
}

function escapeMapText(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    })[character]);
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

function circularFootprint([lng, lat], radiusMeters, sides = 14) {
    const latitudeScale = 1 / 111320;
    const longitudeScale = 1 / (111320 * Math.cos(lat * Math.PI / 180));
    const ring = Array.from({ length: sides }, (_, index) => {
        const angle = (Math.PI * 2 * index) / sides;
        return [
            lng + Math.cos(angle) * radiusMeters * longitudeScale,
            lat + Math.sin(angle) * radiusMeters * latitudeScale
        ];
    });
    ring.push(ring[0]);
    return { type: 'Polygon', coordinates: [ring] };
}

function createTreeVolumes() {
    const trunks = [];
    const lowerCanopies = [];
    const upperCanopies = [];
    campusTrees.features.forEach((feature) => {
        const coordinates = feature.geometry.coordinates;
        const size = Number(feature.properties.size) || 1;
        const palm = feature.properties.kind === 'palm';
        const trunkHeight = (palm ? 5.1 : 3.1) * size;
        const lowerRadius = (palm ? 1.8 : 2.25) * size;
        const upperRadius = (palm ? 1.18 : 1.55) * size;
        const id = feature.properties.id;

        trunks.push({
            type: 'Feature',
            properties: { id: `${id}-trunk`, kind: feature.properties.kind, base: 0, height: trunkHeight },
            geometry: circularFootprint(coordinates, Math.max(0.2, 0.24 * size), 10)
        });
        lowerCanopies.push({
            type: 'Feature',
            properties: {
                id: `${id}-lower`,
                kind: feature.properties.kind,
                base: trunkHeight * (palm ? 0.88 : 0.7),
                height: trunkHeight + (palm ? 0.72 : 1.45) * size
            },
            geometry: circularFootprint(coordinates, lowerRadius)
        });
        upperCanopies.push({
            type: 'Feature',
            properties: {
                id: `${id}-upper`,
                kind: feature.properties.kind,
                base: trunkHeight + (palm ? 0.5 : 1.05) * size,
                height: trunkHeight + (palm ? 1.22 : 2.35) * size
            },
            geometry: circularFootprint(coordinates, upperRadius)
        });
    });
    const collection = (features) => ({ type: 'FeatureCollection', features });
    return { trunks: collection(trunks), lowerCanopies: collection(lowerCanopies), upperCanopies: collection(upperCanopies) };
}

const campusTreeVolumes = createTreeVolumes();

function parkingRow(idPrefix, start, end, depth, spaces) {
    return Array.from({ length: spaces + 1 }, (_, index) => {
        const progress = index / spaces;
        const origin = [
            start[0] + (end[0] - start[0]) * progress,
            start[1] + (end[1] - start[1]) * progress
        ];
        return {
            type: 'Feature',
            properties: { id: `${idPrefix}-${index + 1}`, kind: 'stall-divider' },
            geometry: {
                type: 'LineString',
                coordinates: [origin, [origin[0] + depth[0], origin[1] + depth[1]]]
            }
        };
    });
}

// Divisiones trazadas dentro de las tres huellas OSM verificadas. Las filas
// dejan un pasillo central libre, en vez de cubrir el parqueo con una trama.
const campusParkingMarkings = {
    type: 'FeatureCollection',
    features: [
        ...parkingRow('p1-south', [-69.96147, 18.487645], [-69.96115, 18.487645], [0, 0.000066], 9),
        ...parkingRow('p1-north', [-69.96147, 18.488078], [-69.96115, 18.488078], [0, -0.000066], 9),
        ...parkingRow('p3-west', [-69.963292, 18.487570], [-69.963302, 18.487910], [0.000080, 0], 10),
        ...parkingRow('p3-east', [-69.963040, 18.487570], [-69.963050, 18.487910], [-0.000080, 0], 10),
        ...parkingRow('p2-south', [-69.960665, 18.487628], [-69.959955, 18.487635], [0, 0.000072], 18),
        ...parkingRow('p2-north', [-69.960665, 18.488018], [-69.960060, 18.488018], [0, -0.000070], 16)
    ]
};

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
        return { center: [-69.96238, 18.48772], zoom: 16.95, pitch: 52, bearing: -11 };
    }
    if (containerWidth <= 700) {
        return { center: [-69.96225, 18.48772], zoom: 17.12, pitch: 54, bearing: -12 };
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
        return { ...preset, zoom: Math.min(preset.zoom || 17, 18.18), pitch: Math.min(Math.max(preset.pitch ?? 55, 54), 58) };
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

/**
 * @param {string | HTMLElement} containerId
 * @param {{ compact?: boolean, onBuildingSelect?: (selection: { code: string, name: string }) => void }} options
 */
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
                anchor: 'map',
                color: '#FFF6E8',
                intensity: 0.56,
                position: [1.35, 205, 52]
            },
            sky: {
                'sky-color': '#DCE9EC',
                'horizon-color': '#F4F0E5',
                'fog-color': '#F5F2E9',
                'fog-ground-blend': 0.58,
                'horizon-fog-blend': 0.28,
                'sky-horizon-blend': 0.62,
                'atmosphere-blend': 0.2
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
        antialias: true,
        interactive: true,
        attributionControl: false,
        dragRotate: !options.compact,
        scrollZoom: !options.compact,
        maxBounds: [[-69.9685, 18.4830], [-69.9560, 18.4930]],
        minZoom: 15,
        maxZoom: 20
    });
    let popup = null;
    let popupOpenTimer = null;
    let requestedLighting = { phase: 'day', theme: 'day' };

    const applyLighting = () => {
        if (!map.getLayer('background') || !map.getLayer('campus-ground')) return;
        const isNight = requestedLighting.theme === 'night';
        const palette = {
            morning: {
                background: '#E7F0EA', ground: '#F2EADD', lightColor: '#FFE6BF', intensity: 0.48,
                position: [1.4, 205, 42], exteriorOpacity: 0.36
            },
            day: {
                background: '#EEF3EA', ground: '#F2EDE4', lightColor: '#FFF6E8', intensity: 0.62,
                position: [1.35, 205, 52], exteriorOpacity: 0.34
            },
            sunset: {
                background: '#E7DDD4', ground: '#EDE0D4', lightColor: '#FFD0A6', intensity: 0.44,
                position: [1.8, 190, 28], exteriorOpacity: 0.42
            },
            night: {
                background: '#14241D', ground: '#4A5049', lightColor: '#A9C7BC', intensity: 0.27,
                position: [1.8, 180, 22], exteriorOpacity: 0.58
            }
        }[requestedLighting.phase];

        container?.setAttribute('data-campus-light', requestedLighting.phase);
        container?.setAttribute('data-campus-theme', requestedLighting.theme);
        map.setPaintProperty('background', 'background-color', palette.background);
        map.setPaintProperty('campus-ground', 'fill-color', palette.ground);
        map.setPaintProperty('buildings-base', 'fill-color', selectedBuildingColor(buildingWallColor(isNight)));
        map.setPaintProperty('buildings-3d', 'fill-extrusion-color', selectedBuildingColor(buildingWallColor(isNight)));
        map.setPaintProperty('building-roof-caps', 'fill-extrusion-color', selectedBuildingColor(buildingRoofColor(isNight)));
        for (let floor = 1; floor <= 5; floor += 1) {
            map.setPaintProperty(`building-window-band-${floor}`, 'fill-extrusion-color', buildingGlassColor(isNight));
        }
        map.setPaintProperty('campus-exterior-mask', 'fill-opacity', palette.exteriorOpacity);
        if (typeof map.setLight === 'function') {
            try {
                map.setLight({ anchor: 'map', color: palette.lightColor, intensity: palette.intensity, position: palette.position });
            } catch {
                // Some WebGL implementations draw the fallback shading correctly but reject
                // dynamic style light updates. The color layers above still communicate time.
            }
        }
    };

    map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }), 'bottom-left');

    map.on('load', () => {

        createMapPattern(map, 'parking-asphalt-pattern', (context, width, height) => {
            context.fillStyle = '#777C7A';
            context.fillRect(0, 0, width, height);
            context.fillStyle = 'rgba(242,243,238,0.16)';
            [[6,7],[17,4],[26,13],[9,23],[22,28],[29,20]].forEach(([x, y]) => {
                context.beginPath();
                context.arc(x, y, 0.8, 0, Math.PI * 2);
                context.fill();
            });
        });
        createMapPattern(map, 'parking-deck-pattern', (context, width, height) => {
            context.fillStyle = '#AAA9A3';
            context.fillRect(0, 0, width, height);
            context.strokeStyle = 'rgba(78,80,78,0.14)';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(0, height - 1);
            context.lineTo(width, height - 1);
            context.stroke();
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
        // Vías de servicio y pasillos de parqueo: borde, asfalto y eje sutil.
        map.addLayer({
            id: 'campus-service-road-shadow',
            type: 'line',
            source: 'campus-paths',
            filter: ['==', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': 'rgba(46,49,47,0.22)',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, 5.8,
                    18, 11,
                    20, 18
                ],
                'line-translate': [1.5, 2.5],
                'line-blur': 1.4
            }
        });
        map.addLayer({
            id: 'campus-service-road-edge',
            type: 'line',
            source: 'campus-paths',
            filter: ['==', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': '#5F6663',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, 4.8,
                    18, 9.6,
                    20, 16.5
                ]
            }
        });
        map.addLayer({
            id: 'campus-service-road-surface',
            type: 'line',
            source: 'campus-paths',
            filter: ['==', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': '#858A87',
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    16, 3.7,
                    18, 8,
                    20, 14.2
                ]
            }
        });

        // Senderos peatonales: junta oscura, losa cálida y modulación discreta.
        map.addLayer({
            id: 'campus-footway-shadow',
            type: 'line',
            source: 'campus-paths',
            filter: ['!=', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': 'rgba(70,61,51,0.18)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 3.2, 18, 6.4, 20, 11.4],
                'line-translate': [1, 2],
                'line-blur': 1.2
            }
        });
        map.addLayer({
            id: 'campus-footway-edge',
            type: 'line',
            source: 'campus-paths',
            filter: ['!=', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': '#B8AEA2',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2.7, 18, 5.6, 20, 10.2]
            }
        });
        map.addLayer({
            id: 'campus-footway-surface',
            type: 'line',
            source: 'campus-paths',
            filter: ['!=', ['get', 'pathClass'], 'service'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': ['match', ['get', 'pathClass'], 'covered', '#D3D0C9', '#E7E0D5'],
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2.1, 18, 4.5, 20, 8.5]
            }
        });
        map.addLayer({
            id: 'campus-footway-joints',
            type: 'line',
            source: 'campus-paths',
            minzoom: 18,
            filter: ['==', ['get', 'pathClass'], 'pedestrian'],
            layout: { 'line-cap': 'butt', 'line-join': 'round' },
            paint: {
                'line-color': 'rgba(128,117,104,0.45)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 18, 0.65, 20, 1.1],
                'line-dasharray': [0.35, 3.2]
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

        // La vegetación verificada conserva una sombra de contacto 2D y suma
        // volúmenes ligeros para que la escala del campus se lea en perspectiva.
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
                'circle-color': '#355C39',
                'circle-stroke-width': 0,
                'circle-blur': 0.28,
                'circle-translate': [1, 2],
                'circle-opacity': 0.18
            }
        });

        map.addSource('campus-tree-trunks-3d', { type: 'geojson', data: campusTreeVolumes.trunks });
        map.addLayer({
            id: 'campus-tree-trunks-3d',
            type: 'fill-extrusion',
            source: 'campus-tree-trunks-3d',
            minzoom: 16.2,
            layout: { 'fill-extrusion-rounded-corner-distance': 0.14 },
            paint: {
                'fill-extrusion-color': ['match', ['get', 'kind'], 'palm', '#8A704C', '#725A3E'],
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1,
                'fill-extrusion-vertical-gradient': true
            }
        });
        map.addSource('campus-tree-lower-canopies-3d', { type: 'geojson', data: campusTreeVolumes.lowerCanopies });
        map.addLayer({
            id: 'campus-tree-lower-canopies-3d',
            type: 'fill-extrusion',
            source: 'campus-tree-lower-canopies-3d',
            minzoom: 16.2,
            layout: { 'fill-extrusion-rounded-corner-distance': 0.6 },
            paint: {
                'fill-extrusion-color': ['match', ['get', 'kind'], 'palm', '#739C59', '#4F7E48'],
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 0.98,
                'fill-extrusion-vertical-gradient': true
            }
        });
        map.addSource('campus-tree-upper-canopies-3d', { type: 'geojson', data: campusTreeVolumes.upperCanopies });
        map.addLayer({
            id: 'campus-tree-upper-canopies-3d',
            type: 'fill-extrusion',
            source: 'campus-tree-upper-canopies-3d',
            minzoom: 16.2,
            layout: { 'fill-extrusion-rounded-corner-distance': 0.55 },
            paint: {
                'fill-extrusion-color': ['match', ['get', 'kind'], 'palm', '#88B66B', '#649A59'],
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 0.98,
                'fill-extrusion-vertical-gradient': true
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
            paint: {
                'fill-pattern': 'parking-asphalt-pattern',
                'fill-opacity': 1
            }
        });
        map.addLayer({
            id: 'campus-parking-outline',
            type: 'line',
            source: 'campus-parking',
            filter: ['!=', ['get', 'parking'], 'underground'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': '#5E625F',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1, 19, 2]
            }
        });

        // Plazas individuales: OSM recomienda mantenerlas dentro de la huella
        // general del parqueo. Aquí se dibujan como divisores, dejando libre el
        // pasillo vehicular central en P1, P2 y P3.
        map.addSource('campus-parking-markings', { type: 'geojson', data: campusParkingMarkings });
        map.addLayer({
            id: 'campus-parking-marking-shadow',
            type: 'line',
            source: 'campus-parking-markings',
            minzoom: 16.6,
            layout: { 'line-cap': 'square', 'line-join': 'round' },
            paint: {
                'line-color': 'rgba(34,37,35,0.25)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16.6, 1.1, 19, 2.1],
                'line-translate': [0.7, 0.8]
            }
        });
        map.addLayer({
            id: 'campus-parking-markings',
            type: 'line',
            source: 'campus-parking-markings',
            minzoom: 16.6,
            layout: { 'line-cap': 'square', 'line-join': 'round' },
            paint: {
                'line-color': 'rgba(244,244,237,0.86)',
                'line-width': ['interpolate', ['linear'], ['zoom'], 16.6, 0.7, 19, 1.45],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 16.6, 0.56, 18, 0.94]
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
            paint: {
                'fill-pattern': 'parking-deck-pattern',
                'fill-opacity': 0.92
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
                'line-opacity': 0.78
            }
        });
        map.moveLayer('campus-parking-marking-shadow');
        map.moveLayer('campus-parking-markings');

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
            minzoom: 17.35,
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
            minzoom: 17.15,
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
            minzoom: 17.45,
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
            minzoom: 17.35,
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
                minzoom: 17.25,
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
                'fill-color': '#26332B',
                'fill-translate': [3, 4],
                'fill-opacity': 0.18
            }
        });

        // Base (planta baja)
        map.addLayer({
            id: 'buildings-base',
            type: 'fill',
            source: 'campus',
            paint: {
                'fill-color': selectedBuildingColor(buildingWallColor(false)),
                'fill-opacity': 1
            }
        });

        // Extrusión 3D: familias de material observadas en las fotos oficiales.
        // Las ventanas se construyen después como bandas vectoriales en metros;
        // así no cambian de forma por el remuestreo de una textura al hacer zoom.
        map.addLayer({
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'campus',
            layout: { 'fill-extrusion-rounded-corner-distance': 0.22 },
            paint: {
                'fill-extrusion-color': selectedBuildingColor(buildingWallColor(false)),
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

        for (let floor = 1; floor <= 5; floor += 1) {
            const floorBase = ((floor - 1) * CAMPUS_FLOOR_HEIGHT_METERS) + 1.35;
            map.addLayer({
                id: `building-window-band-${floor}`,
                type: 'fill-extrusion',
                source: 'campus',
                filter: ['>=', ['coalesce', ['get', 'levels'], 2], floor],
                layout: { 'fill-extrusion-rounded-corner-distance': 0.22 },
                paint: {
                    'fill-extrusion-color': buildingGlassColor(false),
                    'fill-extrusion-base': floorBase,
                    'fill-extrusion-height': floorBase + 1.28,
                    'fill-extrusion-opacity': 0.94,
                    'fill-extrusion-vertical-gradient': false
                }
            });
        }

        // Tapas de techo — coherentes con los colores de las paredes
        map.addLayer({
            id: 'building-roof-caps',
            type: 'fill-extrusion',
            source: 'campus',
            layout: { 'fill-extrusion-rounded-corner-distance': 0.22 },
            paint: {
                'fill-extrusion-color': selectedBuildingColor(buildingRoofColor(false)),
                'fill-extrusion-base': ['*', ['coalesce', ['get', 'levels'], 2], CAMPUS_FLOOR_HEIGHT_METERS],
                'fill-extrusion-height': ['+', ['*', ['coalesce', ['get', 'levels'], 2], CAMPUS_FLOOR_HEIGHT_METERS], 0.48],
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
                'fill-extrusion-color': facadeDetailColor(),
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
                'fill-extrusion-color': solarPanelColor(),
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
                'fill-extrusion-color': rooftopStructureColor(),
                'fill-extrusion-base': ['get', 'base'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 1
            }
        });

        // Halo de selección: refuerza el perímetro del volumen activo.
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
                ],
                'line-width-transition': { duration: 0 },
                'line-opacity-transition': { duration: 0 }
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
        map.addSource('active-building-label', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        map.addLayer({
            id: 'building-code-label',
            type: 'symbol',
            source: 'labels',
            minzoom: 16.55,
            layout: {
                'text-field': ['get', 'code'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16, 8, 17.5, 10.5, 18.5, 12, 19.2, 13],
                'text-offset': [0, -0.3],
                'text-anchor': 'center',
                'text-allow-overlap': false,
                'text-ignore-placement': false,
                'text-padding': 4
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

        map.addLayer({
            id: 'active-building-label',
            type: 'symbol',
            source: 'active-building-label',
            layout: {
                'text-field': ['get', 'code'],
                'text-font': ['Open Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 16.5, 11, 19, 15],
                'text-offset': [0, -0.35],
                'text-anchor': 'center',
                'text-allow-overlap': true,
                'text-ignore-placement': true
            },
            paint: {
                'text-color': '#FFFFFF',
                'text-halo-color': '#9F1730',
                'text-halo-width': 4,
                'text-halo-blur': 0.5
            }
        });

        map.addLayer({
            id: 'active-building-name',
            type: 'symbol',
            source: 'active-building-label',
            minzoom: 17.75,
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 17.75, 8.5, 19, 11],
                'text-offset': [0, 1.15],
                'text-anchor': 'top',
                'text-max-width': 12,
                'text-allow-overlap': true,
                'text-ignore-placement': true
            },
            paint: {
                'text-color': '#4B332D',
                'text-halo-color': 'rgba(255,250,242,0.98)',
                'text-halo-width': 2.2,
                'text-halo-blur': 0.35
            }
        });

        map.addSource('campus-landmark-labels', { type: 'geojson', data: campusLandmarkLabels });
        map.addLayer({
            id: 'campus-landmark-labels',
            type: 'symbol',
            source: 'campus-landmark-labels',
            minzoom: 17.65,
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
            minzoom: 17.45,
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

        const availableBuildingLayers = BUILDING_PICK_LAYERS.filter(layerId => map.getLayer(layerId));
        const buildingAtPoint = (point) => {
            const renderedFeatures = map.queryRenderedFeatures(point, { layers: availableBuildingLayers });
            for (const feature of renderedFeatures) {
                const code = feature.properties?.code || feature.properties?.buildingCode;
                const building = CAMPUS_BUILDINGS.find(candidate => candidate.properties.code === code);
                if (building) return building;
            }
            return null;
        };

        // Toda la geometría visible de un edificio (techo, cristales, paneles,
        // detalles y rótulos) funciona como una misma zona de selección.
        map.on('mousemove', (e) => {
            map.getCanvas().style.cursor = buildingAtPoint(e.point) ? 'pointer' : '';
        });
        map.on('mouseout', () => { map.getCanvas().style.cursor = ''; });

        // ── Ficha reutilizable, compacta y colocada al lado del volumen ──
        // ── Click en edificio: popup con datos oficiales ──
        map.on('click', (e) => {
            const selectedBuilding = buildingAtPoint(e.point);
            if (!selectedBuilding) {
                if (popupOpenTimer) window.clearTimeout(popupOpenTimer);
                popup?.remove();
                popup = null;
                return;
            }
            const props = selectedBuilding.properties;
            const code = props.code;

            if (code) {
                controller.highlightBuilding(code);
                controller.focusCamera(code);
                options.onBuildingSelect?.({ code, name: props.name || props.shortName || code });
            }

            // Muestra primero lo esencial y deja el inventario largo bajo
            // divulgación progresiva para no cubrir la maqueta completa.
            let facilitiesList = '';
            try {
                const facs = typeof props.facilities === 'string'
                    ? JSON.parse(props.facilities)
                    : (props.facilities || []);
                if (facs.length > 0) {
                    const primaryFacilities = facs.slice(0, 3);
                    const remainingFacilities = facs.slice(3);
                    const primaryList = `<ul class="popup-facilities">${primaryFacilities.map(f => `<li>${escapeMapText(f)}</li>`).join('')}</ul>`;
                    const remainingList = remainingFacilities.length > 0
                        ? `<details class="popup-more"><summary>Ver ${remainingFacilities.length} espacio${remainingFacilities.length === 1 ? '' : 's'} más</summary><ul class="popup-facilities popup-facilities--more">${remainingFacilities.map(f => `<li>${escapeMapText(f)}</li>`).join('')}</ul></details>`
                        : '';
                    facilitiesList = `<div class="popup-body"><p class="popup-section-label">Espacios principales</p>${primaryList}${remainingList}</div>`;
                }
            } catch {}

            const html = `
                <div class="popup-header">
                    <span class="popup-code">${escapeMapText(code || '—')}</span>
                    <span class="popup-name">${escapeMapText(props.name || props.shortName || '')}</span>
                </div>
                ${facilitiesList}
            `;

            if (popupOpenTimer) window.clearTimeout(popupOpenTimer);
            popup?.remove();
            popup = null;
            const popupLngLat = props.centroid_lng
                ? [props.centroid_lng, props.centroid_lat]
                : e.lngLat;

            // Espera a que terminen el enfoque y la expansión. Si la ficha se
            // añade durante el vuelo, el auto-pan calcula sobre el viewport
            // anterior y puede dejarla recortada en el borde.
            popupOpenTimer = window.setTimeout(() => {
                if (!map.getCanvas()?.isConnected) return;
                const projected = map.project(popupLngLat);
                const mapWidth = container?.clientWidth || map.getCanvas().clientWidth;
                const anchor = projected.x <= mapWidth / 2 ? 'left' : 'right';
                const nextPopup = new maplibregl.Popup({
                    closeButton: true,
                    closeOnClick: false,
                    className: `campus-popup campus-popup--${anchor}`,
                    maxWidth: '256px',
                    anchor,
                    offset: anchor === 'left' ? [28, 0] : [-28, 0]
                });
                popup = nextPopup;
                nextPopup.setLngLat(popupLngLat).setHTML(html).addTo(map);

                const popupBody = nextPopup.getElement()?.querySelector('.popup-body');
                const moreDetails = popupBody?.querySelector('.popup-more');
                moreDetails?.addEventListener('toggle', () => {
                    if (!moreDetails.open) {
                        popupBody.scrollTo({ top: 0, behavior: 'auto' });
                        return;
                    }
                    window.requestAnimationFrame(() => {
                        const bodyTop = popupBody.getBoundingClientRect().top;
                        const detailsTop = moreDetails.getBoundingClientRect().top;
                        const nextTop = popupBody.scrollTop + detailsTop - bodyTop - 6;
                        popupBody.scrollTo({
                            top: Math.max(0, nextTop),
                            behavior: selectionMotionIsReduced() ? 'auto' : 'smooth'
                        });
                    });
                });
            }, selectionMotionIsReduced() ? 40 : 690);
        });

        if (container) {
            applyLighting();
            container.dataset.loaded = 'true';
            container.dispatchEvent(new CustomEvent('campus-map-ready'));
        }
    });

    const resizeObserver = container && 'ResizeObserver' in window
        ? new ResizeObserver(() => map.resize())
        : null;
    resizeObserver?.observe(container);

    let currentActiveCode = null;
    let selectionAnimationFrame = null;
    let lastSelectionPulse = 0;

    const selectionMotionIsReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || document.documentElement.dataset.reduceMotion === 'true';

    const setSelectionPulse = (progress = 0.5) => {
        if (!map.getLayer('building-selection-halo')) return;
        const width = 5.2 + progress * 3.2;
        const opacity = 0.24 + progress * 0.22;
        map.setPaintProperty('building-selection-halo', 'line-width', width);
        map.setPaintProperty('building-selection-halo', 'line-opacity', [
            'case', ['boolean', ['feature-state', 'active'], false], opacity, 0
        ]);
    };

    const animateSelection = (timestamp) => {
        if (!currentActiveCode || document.hidden || selectionMotionIsReduced()) {
            selectionAnimationFrame = null;
            setSelectionPulse(0.5);
            return;
        }
        if (timestamp - lastSelectionPulse >= 42) {
            const progress = (Math.sin(timestamp / 360) + 1) / 2;
            setSelectionPulse(progress);
            lastSelectionPulse = timestamp;
        }
        selectionAnimationFrame = window.requestAnimationFrame(animateSelection);
    };

    const syncSelectionAnimation = () => {
        if (selectionAnimationFrame) window.cancelAnimationFrame(selectionAnimationFrame);
        selectionAnimationFrame = null;
        setSelectionPulse(0.5);
        if (currentActiveCode && !document.hidden && !selectionMotionIsReduced()) {
            selectionAnimationFrame = window.requestAnimationFrame(animateSelection);
        }
    };

    const handleVisibilityChange = () => syncSelectionAnimation();
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
                const activeBuilding = code
                    ? CAMPUS_BUILDINGS.find(feature => feature.properties.code === code && feature.properties.centroid_lng)
                    : null;
                const selectedCode = activeBuilding?.properties.code || '';
                for (let floor = 1; floor <= 5; floor += 1) {
                    map.setFilter(`building-window-band-${floor}`, [
                        'all',
                        ['>=', ['coalesce', ['get', 'levels'], 2], floor],
                        ['!=', ['get', 'code'], selectedCode]
                    ]);
                }
                map.setPaintProperty('campus-facade-details-3d', 'fill-extrusion-color', facadeDetailColor(selectedCode));
                map.setPaintProperty('campus-solar-panels', 'fill-extrusion-color', solarPanelColor(selectedCode));
                map.setPaintProperty('campus-rooftop-structures', 'fill-extrusion-color', rooftopStructureColor(selectedCode));
                const activeLabelSource = map.getSource('active-building-label');
                activeLabelSource?.setData({
                    type: 'FeatureCollection',
                    features: activeBuilding ? [{
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [activeBuilding.properties.centroid_lng, activeBuilding.properties.centroid_lat]
                        },
                        properties: {
                            code: activeBuilding.properties.code,
                            name: activeBuilding.properties.name
                        }
                    }] : []
                });
                currentActiveCode = code || null;
                syncSelectionAnimation();
            };
            map.isStyleLoaded() ? doHighlight() : map.once('load', doHighlight);
        },

        setLighting: (phase, theme) => {
            requestedLighting = { phase, theme };
            applyLighting();
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
            if (popupOpenTimer) window.clearTimeout(popupOpenTimer);
            popup?.remove();
            if (selectionAnimationFrame) window.cancelAnimationFrame(selectionAnimationFrame);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            resizeObserver?.disconnect();
            map.remove();
        }
    };

    return controller;
}
