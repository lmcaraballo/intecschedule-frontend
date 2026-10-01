import buildingSnapshot from '../scratch/data.json';
import surfaceSnapshot from '../scratch/campus_surfaces_detail.json';

// Extractos locales de OpenStreetMap (24-08-2026). El contexto se genera en
// memoria para conservar las coordenadas originales y no depender de una API.
const CONTEXT_BOUNDS = {
    west: -69.96535,
    east: -69.95935,
    south: 18.48685,
    north: 18.48905
};

const CAMPUS_BUILDING_WAYS = new Set([
    220839013, 220839014, 286086061, 293071302, 293071303,
    640894678, 640894679, 640894681, 640894683, 640894685,
    1026541328
]);

const VERIFIED_CONTEXT_LABELS = new Set([
    'Avenida de los Próceres',
    'Avenida República de Colombia',
    'Calle Los Crisantemos'
]);

function nodeIndex(snapshot) {
    return new Map(
        snapshot.elements
            .filter(element => element.type === 'node')
            .map(node => [node.id, [node.lon, node.lat]])
    );
}

function wayCoordinates(way, nodes) {
    return (way.nodes || []).map(id => nodes.get(id)).filter(Boolean);
}

function isInContext(coordinates) {
    if (!coordinates.length) return false;
    return coordinates.some(([lng, lat]) =>
        lng >= CONTEXT_BOUNDS.west && lng <= CONTEXT_BOUNDS.east
        && lat >= CONTEXT_BOUNDS.south && lat <= CONTEXT_BOUNDS.north
    );
}

function contextBuildings() {
    const nodes = nodeIndex(buildingSnapshot);
    return buildingSnapshot.elements
        .filter(element => element.type === 'way'
            && element.tags?.building
            && !CAMPUS_BUILDING_WAYS.has(element.id))
        .map(way => ({ way, coordinates: wayCoordinates(way, nodes) }))
        .filter(({ coordinates }) => coordinates.length >= 4 && isInContext(coordinates))
        .map(({ way, coordinates }) => ({
            type: 'Feature',
            properties: { osmId: `way/${way.id}`, contextOnly: true },
            geometry: { type: 'Polygon', coordinates: [coordinates] }
        }));
}

function contextRoads() {
    const nodes = nodeIndex(surfaceSnapshot);
    const features = surfaceSnapshot.elements
        .filter(element => element.type === 'way' && element.tags?.highway)
        .map(way => ({ way, coordinates: wayCoordinates(way, nodes) }))
        .filter(({ coordinates }) => coordinates.length >= 2 && isInContext(coordinates))
        .map(({ way, coordinates }) => {
            const highway = way.tags.highway;
            const roadClass = ['primary', 'secondary', 'tertiary'].includes(highway)
                ? 'major'
                : ['residential', 'living_street', 'unclassified'].includes(highway)
                    ? 'street'
                    : highway === 'service' ? 'service' : 'path';
            return {
                type: 'Feature',
                properties: {
                    osmId: `way/${way.id}`,
                    name: way.tags.name || '',
                    roadClass,
                    showLabel: false
                },
                geometry: { type: 'LineString', coordinates }
            };
        });

    // Una sola etiqueta por vía, sobre el tramo con más vértices para
    // reducir duplicados y favorecer una colocación estable.
    for (const name of VERIFIED_CONTEXT_LABELS) {
        const candidate = features
            .filter(feature => feature.properties.name === name)
            .sort((a, b) => b.geometry.coordinates.length - a.geometry.coordinates.length)[0];
        if (candidate) candidate.properties.showLabel = true;
    }

    return features;
}

export const campusContextBuildings = {
    type: 'FeatureCollection',
    features: contextBuildings()
};

export const campusContextRoads = {
    type: 'FeatureCollection',
    features: contextRoads()
};
