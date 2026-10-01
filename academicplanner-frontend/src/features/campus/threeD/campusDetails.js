const polygon = (coordinates, properties) => ({
    type: 'Feature',
    properties,
    geometry: { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] }
});

const point = (coordinates, properties) => ({
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates }
});

const line = (coordinates, properties) => ({
    type: 'Feature',
    properties,
    geometry: { type: 'LineString', coordinates }
});

const rectangle = (west, south, east, north, properties) => polygon([
    [west, south], [east, south], [east, north], [west, north]
], properties);

// Una sola escala vertical para edificios y detalles de cubierta. Evita que
// paneles, remates o fachadas queden flotando cuando cambia la altura por piso.
export const CAMPUS_FLOOR_HEIGHT_METERS = 3.5;
const EL_ROOF_CAP_METERS = 5 * CAMPUS_FLOOR_HEIGHT_METERS + 0.3;

const solarProperties = (id, buildingCode, levels, confidence = 'high') => ({
    id,
    buildingCode,
    material: 'solar',
    evidence: 'satellite-2026-08-24',
    confidence,
    base: levels * CAMPUS_FLOOR_HEIGHT_METERS + 0.32,
    height: levels * CAMPUS_FLOOR_HEIGHT_METERS + 0.62
});

const solarRectangle = (west, south, east, north, id, buildingCode, levels, confidence) =>
    rectangle(west, south, east, north, solarProperties(id, buildingCode, levels, confidence));

const solarPolygon = (coordinates, id, buildingCode, levels, confidence) =>
    polygon(coordinates, solarProperties(id, buildingCode, levels, confidence));

export const campusAddedBuildings = {
    type: 'FeatureCollection',
    features: [
        rectangle(-69.962195, 18.487625, -69.962045, 18.487805, {
            code: 'DP',
            shortName: 'De Ramón Picazo',
            name: 'Edificio De Ramón Picazo',
            levels: 4,
            facilities: ['LibrINTEC', 'Salón de Videoconferencias', 'Economato'],
            verified: true,
            centroid_lng: -69.962120,
            centroid_lat: 18.487715,
            numericId: 101
        })
    ]
};

// Accesos trasladados al perímetro del plano oficial del campus.
export const campusGates = {
    type: 'FeatureCollection',
    features: [
        point([-69.963255, 18.488135], { name: 'Puerta 1', label: 'P1', heading: 0, kind: 'portal' }),
        point([-69.96220, 18.488114], { name: 'Puerta 2', label: 'P2', heading: 0, kind: 'double-portal' }),
        point([-69.96150, 18.488101], { name: 'Puerta 3', label: 'P3', heading: 0, kind: 'double-portal' }),
        point([-69.96050, 18.487579], { name: 'Puerta 4', label: 'P4', heading: 0, kind: 'gate' }),
        point([-69.960945, 18.487567], { name: 'Puerta 5', label: 'P5', heading: 0, kind: 'portal' }),
        point([-69.961829, 18.487562], { name: 'Puerta 6', label: 'P6', heading: 0, kind: 'gate' }),
        point([-69.963126, 18.487553], { name: 'Puerta 7', label: 'P7', heading: 0, kind: 'gate' }),
        point([-69.96358, 18.487515], { name: 'Puerta 8', label: 'P8', heading: 24, kind: 'pillar' }),
        point([-69.96378, 18.487320], { name: 'Puerta 9', label: 'P9', heading: -58, kind: 'gate' })
    ]
};

function makeGateGeometry(gate) {
    const [lng, lat] = gate.geometry.coordinates;
    const angle = gate.properties.heading * Math.PI / 180;
    const tx = Math.cos(angle);
    const ty = Math.sin(angle);
    const nx = -ty;
    const ny = tx;
    const halfSpan = gate.properties.kind === 'pillar' ? 0.000020 : 0.000034;
    const pierHalf = 0.000009;
    const pierDepth = 0.000010;

    const pier = (side) => {
        const cx = lng + tx * halfSpan * side;
        const cy = lat + ty * halfSpan * side;
        return polygon([
            [cx - tx * pierHalf - nx * pierDepth, cy - ty * pierHalf - ny * pierDepth],
            [cx + tx * pierHalf - nx * pierDepth, cy + ty * pierHalf - ny * pierDepth],
            [cx + tx * pierHalf + nx * pierDepth, cy + ty * pierHalf + ny * pierDepth],
            [cx - tx * pierHalf + nx * pierDepth, cy - ty * pierHalf + ny * pierDepth]
        ], {
            gate: gate.properties.name,
            height: gate.properties.kind === 'pillar' ? 2.7 : 3.1,
            material: 'concrete'
        });
    };

    const gateLine = {
        type: 'Feature',
        properties: { gate: gate.properties.name, material: 'metal' },
        geometry: {
            type: 'LineString',
            coordinates: [
                [lng - tx * (halfSpan - pierHalf), lat - ty * (halfSpan - pierHalf)],
                [lng + tx * (halfSpan - pierHalf), lat + ty * (halfSpan - pierHalf)]
            ]
        }
    };

    const lintel = (base, height, id) => {
        const span = halfSpan + pierHalf;
        const depth = pierDepth * 1.15;
        return polygon([
            [lng - tx * span - nx * depth, lat - ty * span - ny * depth],
            [lng + tx * span - nx * depth, lat + ty * span - ny * depth],
            [lng + tx * span + nx * depth, lat + ty * span + ny * depth],
            [lng - tx * span + nx * depth, lat - ty * span + ny * depth]
        ], {
            id: `${gate.properties.label}-${id}`,
            gate: gate.properties.name,
            material: 'concrete',
            base,
            height
        });
    };

    const lintels = [];
    if (gate.properties.kind === 'portal' || gate.properties.kind === 'double-portal') {
        lintels.push(lintel(2.38, 2.92, 'lintel-lower'));
    }
    if (gate.properties.kind === 'double-portal') {
        lintels.push(lintel(3.22, 3.58, 'lintel-upper'));
    }

    return { piers: [pier(-1), pier(1)], gateLine, lintels };
}

const gateGeometry = campusGates.features.map(makeGateGeometry);

export const campusGatePiers = {
    type: 'FeatureCollection',
    features: gateGeometry.flatMap(item => item.piers)
};

export const campusGateBars = {
    type: 'FeatureCollection',
    features: gateGeometry.map(item => item.gateLine)
};

export const campusGateLintels = {
    type: 'FeatureCollection',
    features: gateGeometry.flatMap(item => item.lintels)
};

// Árboles interiores indicativos a partir del plano oficial y de fotos 2023–2024.
// Se concentran en áreas donde sí está probada la vegetación, pero no pretenden
// registrar cada tronco como una coordenada topográfica.
const treeCoordinates = [
    // Bosquecito y jardín occidental.
    [-69.96443, 18.48779, 'shade', 1.35], [-69.96434, 18.48783, 'shade', 1.20],
    [-69.96425, 18.48786, 'palm', 0.92], [-69.96417, 18.48782, 'shade', 1.25],
    [-69.96410, 18.48787, 'shade', 1.15], [-69.96431, 18.48775, 'palm', 0.86],
    [-69.96418, 18.48774, 'shade', 1.05], [-69.96438, 18.48770, 'shade', 1.15],
    [-69.96405, 18.48773, 'palm', 0.88],

    // Plazoleta occidental AJ–Fundadores–AH.
    [-69.96370, 18.48778, 'palm', 0.88], [-69.96363, 18.48788, 'shade', 1.10],
    [-69.96364, 18.48784, 'shade', 1.00], [-69.96361, 18.48791, 'palm', 0.84],

    // Jardines de FD, EL y la plazoleta principal. Son copas indicativas:
    // las fotos confirman vegetación madura, no cada tronco de forma métrica.
    [-69.96304, 18.48788, 'palm', 0.90], [-69.96283, 18.48790, 'shade', 1.18],
    [-69.96264, 18.48787, 'palm', 0.86], [-69.96232, 18.48796, 'shade', 1.08],
    [-69.96222, 18.48797, 'palm', 0.84], [-69.96209, 18.48793, 'shade', 1.00],

    // Copa continua observada entre las cubiertas y avenida Los Próceres.
    [-69.96320, 18.488125, 'shade', 1.18], [-69.96302, 18.488125, 'shade', 1.22],
    [-69.96282, 18.488118, 'shade', 1.16], [-69.96261, 18.488116, 'shade', 1.12],
    [-69.96235, 18.488120, 'shade', 1.08], [-69.96202, 18.488115, 'shade', 1.15],
    [-69.96178, 18.488110, 'shade', 1.18], [-69.96130, 18.488105, 'shade', 1.10],

    // Borde sur peatonal, sin invadir los edificios.
    [-69.96345, 18.48758, 'palm', 0.88], [-69.96322, 18.48758, 'shade', 0.98],
    [-69.96293, 18.48758, 'palm', 0.82], [-69.96267, 18.48759, 'shade', 0.94],
    [-69.96242, 18.48759, 'palm', 0.82], [-69.96211, 18.48759, 'shade', 0.92],
    [-69.96187, 18.48760, 'palm', 0.82], [-69.96162, 18.48760, 'shade', 0.94],

    // Jardines de EP y remate oriental.
    [-69.96108, 18.48806, 'shade', 0.98], [-69.96093, 18.48805, 'palm', 0.84],
    [-69.96064, 18.48804, 'shade', 1.04], [-69.96039, 18.48800, 'palm', 0.86],
    [-69.96017, 18.48793, 'shade', 1.08], [-69.96000, 18.48783, 'palm', 0.86],
    [-69.95990, 18.48772, 'shade', 1.10],

    // Separadores vegetales confirmados alrededor de P1 y EP.
    [-69.96149, 18.48763, 'shade', 1.02], [-69.96130, 18.48762, 'palm', 0.86],
    [-69.96118, 18.48786, 'shade', 1.06], [-69.96118, 18.48798, 'shade', 1.02]
];

export const campusTrees = {
    type: 'FeatureCollection',
    features: treeCoordinates.map(([lng, lat, kind, size], index) =>
        point([lng, lat], { id: `campus-tree-${index + 1}`, kind, size })
    )
};

// Las zonas verdes de OSM incluidas en campusFeatures pertenecen mayormente a
// parques del vecindario. Estas huellas son una simplificación del plano oficial
// y conservan libres las circulaciones y edificios principales.
export const campusGreenAreas = {
    type: 'FeatureCollection',
    features: [
        polygon([
            [-69.96451, 18.48778], [-69.96440, 18.48786], [-69.96425, 18.48791],
            [-69.96408, 18.48792], [-69.96402, 18.48786], [-69.96408, 18.48777],
            [-69.96428, 18.48772], [-69.96443, 18.48774]
        ], { id: 'bosquecito', name: 'Bosquecito', kind: 'forest' }),
        polygon([
            [-69.96372, 18.48774], [-69.96360, 18.48776], [-69.96358, 18.48784],
            [-69.96359, 18.48794], [-69.96368, 18.48791], [-69.96375, 18.48782]
        ], { id: 'jardin-plazoleta-oeste', kind: 'garden' }),
        polygon([
            [-69.96325, 18.48791], [-69.96306, 18.48792], [-69.96282, 18.48793],
            [-69.96270, 18.48791], [-69.96270, 18.48786], [-69.96287, 18.48785],
            [-69.96308, 18.48785], [-69.96325, 18.48786]
        ], { id: 'jardin-fd', kind: 'garden' }),
        polygon([
            [-69.96237, 18.48793], [-69.96225, 18.48800], [-69.96208, 18.48800],
            [-69.96204, 18.48796], [-69.96210, 18.48791], [-69.96225, 18.48790]
        ], { id: 'jardin-plaza-principal', kind: 'garden' }),
        polygon([
            [-69.96331, 18.488106], [-69.96267, 18.488106], [-69.96265, 18.488136],
            [-69.96331, 18.488142]
        ], { id: 'borde-arbolado-norte-fd', kind: 'forest-border' }),
        polygon([
            [-69.96264, 18.488086], [-69.96118, 18.488075], [-69.96116, 18.488116],
            [-69.96264, 18.488132]
        ], { id: 'borde-arbolado-norte-central', kind: 'forest-border' }),
        polygon([
            [-69.96353, 18.487552], [-69.96331, 18.487554], [-69.96310, 18.487560],
            [-69.96310, 18.487602], [-69.96331, 18.487602], [-69.96350, 18.487594]
        ], { id: 'jardin-sur-ah', kind: 'border' }),
        polygon([
            [-69.96302, 18.487558], [-69.96276, 18.487562], [-69.96248, 18.487566],
            [-69.96222, 18.487570], [-69.96222, 18.487607], [-69.96250, 18.487606],
            [-69.96276, 18.487604], [-69.96302, 18.487600]
        ], { id: 'jardin-sur-gc', kind: 'border' }),
        polygon([
            [-69.96204, 18.487572], [-69.96178, 18.487574], [-69.96153, 18.487575],
            [-69.96130, 18.487577], [-69.96130, 18.487620], [-69.96155, 18.487617],
            [-69.96179, 18.487614], [-69.96204, 18.487610]
        ], { id: 'jardin-sur-biblioteca', kind: 'border' }),
        polygon([
            [-69.96112, 18.488040], [-69.96091, 18.488035], [-69.96070, 18.488032],
            [-69.96070, 18.488075], [-69.96091, 18.488082], [-69.96112, 18.488086]
        ], { id: 'jardin-norte-ep', kind: 'border' }),
        polygon([
            [-69.96036, 18.487990], [-69.96019, 18.487935], [-69.96004, 18.487842],
            [-69.95991, 18.487725], [-69.95987, 18.487665], [-69.95986, 18.487715],
            [-69.95992, 18.487800], [-69.96007, 18.487930], [-69.96022, 18.488010]
        ], { id: 'jardin-remate-este', kind: 'border' })
    ]
};

export const campusSurfaces = {
    type: 'FeatureCollection',
    features: [
        rectangle(-69.96267, 18.48795, -69.96257, 18.48802, {
            id: 'cafe-deck', material: 'wood'
        }),
        rectangle(-69.962575, 18.487805, -69.962360, 18.487925, {
            id: 'el-foodcourt-terrace', material: 'terrace'
        }),
        rectangle(-69.962055, 18.487765, -69.962018, 18.487895, {
            id: 'library-entry-landing', material: 'terracotta'
        })
    ]
};

// Café Santo Domingo junto a EL. La foto frontal confirma vidrio, bastidores
// rojos, fascia blanca y toldo oscuro; evitamos representarlo como un bloque rojo.
export const campusDetailStructures = {
    type: 'FeatureCollection',
    features: [
        rectangle(-69.96265, 18.48796, -69.96259, 18.48801, {
            id: 'cafe-glass-shell', name: 'Café Santo Domingo', material: 'cafe-glass', height: 3.25, base: 0.18
        }),
        rectangle(-69.96264, 18.48797, -69.96260, 18.48800, {
            id: 'cafe-interior', name: 'Interior del café', material: 'cafe-interior', height: 2.75, base: 0.08
        }),
        rectangle(-69.96265, 18.48796, -69.96264, 18.48801, {
            id: 'cafe-frame-west', material: 'brand-red', height: 3.55, base: 0
        }),
        rectangle(-69.96260, 18.48796, -69.96259, 18.48801, {
            id: 'cafe-frame-east', material: 'brand-red', height: 3.55, base: 0
        }),
        rectangle(-69.96265, 18.48796, -69.96259, 18.48801, {
            id: 'cafe-red-crown', material: 'brand-red', height: 3.62, base: 3.26
        }),
        rectangle(-69.96266, 18.487955, -69.96258, 18.487965, {
            id: 'cafe-awning', name: 'Terraza del café', material: 'awning', height: 2.65, base: 2.4
        }),
        rectangle(-69.962655, 18.487965, -69.962585, 18.488015, {
            id: 'cafe-white-fascia', material: 'cafe-white', height: 3.88, base: 3.50
        })
    ]
};

export const campusCafeFurniture = {
    type: 'FeatureCollection',
    features: [
        [-69.96265, 18.48797], [-69.96263, 18.48797], [-69.96261, 18.48797],
        [-69.96265, 18.48799], [-69.96263, 18.48799], [-69.96261, 18.48799]
    ].map((coordinates, index) => point(coordinates, { id: `cafe-table-${index + 1}` }))
};

export const campusRoofDetails = {
    type: 'FeatureCollection',
    features: [
        // FD: ocho paños dentro de las dos alas visibles en las tomas aéreas.
        solarRectangle(-69.963262, 18.488004, -69.963207, 18.488092, 'fd-solar-west-1', 'FD', 4),
        solarRectangle(-69.963199, 18.488004, -69.963144, 18.488092, 'fd-solar-west-2', 'FD', 4),
        solarRectangle(-69.963136, 18.488004, -69.963081, 18.488092, 'fd-solar-west-3', 'FD', 4),
        solarRectangle(-69.963073, 18.488004, -69.963018, 18.488092, 'fd-solar-west-4', 'FD', 4),
        solarRectangle(-69.962928, 18.487961, -69.962878, 18.488066, 'fd-solar-east-1', 'FD', 4),
        solarRectangle(-69.962870, 18.487961, -69.962820, 18.488066, 'fd-solar-east-2', 'FD', 4),
        solarRectangle(-69.962812, 18.487961, -69.962762, 18.488066, 'fd-solar-east-3', 'FD', 4),
        solarRectangle(-69.962754, 18.487961, -69.962704, 18.488066, 'fd-solar-east-4', 'FD', 4),

        // GC: tres grupos separados por el corredor central de la huella OSM.
        solarRectangle(-69.962990, 18.487630, -69.962800, 18.487700, 'gc-solar-west', 'GC', 4),
        solarRectangle(-69.962760, 18.487630, -69.962680, 18.487700, 'gc-solar-center', 'GC', 4),
        solarRectangle(-69.962550, 18.487635, -69.962240, 18.487720, 'gc-solar-east', 'GC', 4),

        // Biblioteca: cuatro paños perimetrales dejan libre el volumen/patio central.
        solarRectangle(-69.961990, 18.487700, -69.961810, 18.487780, 'biblioteca-solar-west-south', 'Biblioteca', 3),
        solarRectangle(-69.961990, 18.487830, -69.961810, 18.487950, 'biblioteca-solar-west-north', 'Biblioteca', 3),
        solarRectangle(-69.961770, 18.487725, -69.961600, 18.487780, 'biblioteca-solar-east-south', 'Biblioteca', 3),
        solarRectangle(-69.961770, 18.487830, -69.961600, 18.487950, 'biblioteca-solar-east-north', 'Biblioteca', 3),

        // DP: dos franjas visibles junto al remate rojizo de cubierta.
        solarRectangle(-69.962180, 18.487640, -69.962060, 18.487700, 'dp-solar-south', 'DP', 4),
        solarRectangle(-69.962180, 18.487720, -69.962060, 18.487790, 'dp-solar-north', 'DP', 4),

        // EP / Centro MIPYMES: paños repartidos entre sus dos volúmenes.
        solarRectangle(-69.961070, 18.487810, -69.960960, 18.487960, 'ep-solar-west', 'EP', 5),
        solarRectangle(-69.960880, 18.487825, -69.960840, 18.487940, 'ep-solar-center', 'EP', 5),
        solarRectangle(-69.960880, 18.487825, -69.960810, 18.487965, 'ep-solar-east-north', 'EP', 5),
        solarRectangle(-69.960820, 18.487630, -69.960730, 18.487790, 'ep-solar-east-south', 'EP', 5),

        // PB: dos paños girados contenidos por su huella oblicua.
        solarPolygon([
            [-69.963920, 18.487485], [-69.963912, 18.487411],
            [-69.963815, 18.487420], [-69.963830, 18.487465]
        ], 'pb-solar-west', 'PB', 3),
        solarPolygon([
            [-69.963795, 18.487428], [-69.963665, 18.487440],
            [-69.963670, 18.487466], [-69.963800, 18.487454]
        ], 'pb-solar-east', 'PB', 3),

        // EL: la losa superior sobresale de la torre, tal como muestran P2 y
        // las vistas profesionales. La torre vertical de vidrio sigue siendo EL.
        rectangle(-69.962571, 18.487804, -69.962369, 18.488087, {
            id: 'el-roof-overhang', material: 'roof-white', base: EL_ROOF_CAP_METERS, height: EL_ROOF_CAP_METERS + 0.45
        }),

        // AJ: remate oscuro del atrio central; aproximación estilizada basada
        // en la foto 1 y la fachada oficial, contenida dentro de su huella.
        rectangle(-69.963932, 18.487660, -69.963875, 18.487700, {
            id: 'aj-atrium-canopy', material: 'roof-charcoal', base: 10.50, height: 10.90
        })
    ]
};

export const campusLandmarkLabels = {
    type: 'FeatureCollection',
    features: [
        point([-69.96418, 18.48786], { name: 'Bosquecito', scope: 'campus' }),
        point([-69.962047, 18.488729], { name: 'Parque Jimenoa', scope: 'context' })
    ]
};

// Detalles arquitectónicos derivados de fotografías identificables del campus.
export const campusFacadeDetails = {
    type: 'FeatureCollection',
    features: [
        // Biblioteca: dos paños murales que flanquean la entrada principal.
        rectangle(-69.962032, 18.487700, -69.961992, 18.487765, {
            id: 'biblioteca-mural-sur', material: 'mural-magenta', base: 0, height: 11.0
        }),
        rectangle(-69.962034, 18.487895, -69.961994, 18.487958, {
            id: 'biblioteca-mural-norte', material: 'mural-coral', base: 0, height: 11.0
        }),
        rectangle(-69.962040, 18.487720, -69.962030, 18.487752, {
            id: 'biblioteca-mural-azul-sur', material: 'mural-blue', base: 2.5, height: 9.7
        }),
        rectangle(-69.962042, 18.487912, -69.962032, 18.487944, {
            id: 'biblioteca-mural-azul-norte', material: 'mural-blue', base: 2.5, height: 9.7
        }),

        // Colores secundarios del mural actual, usados como acentos low-poly.
        rectangle(-69.962044, 18.487735, -69.962034, 18.487756, {
            id: 'biblioteca-mural-amarillo-sur', material: 'mural-yellow', base: 7.2, height: 10.1
        }),
        rectangle(-69.962044, 18.487902, -69.962034, 18.487920, {
            id: 'biblioteca-mural-naranja-norte', material: 'mural-orange', base: 5.6, height: 10.4
        }),
        rectangle(-69.962035, 18.487765, -69.962013, 18.487895, {
            id: 'biblioteca-salmon-entry', material: 'library-salmon', base: 0, height: 3.45
        }),

        // Núcleo localizado de FD, visible en fotografías institucionales.
        rectangle(-69.9630074, 18.4879898, -69.9629416, 18.4880727, {
            id: 'fd-red-core', material: 'architectural-wine', base: 0, height: 14.15
        }),

        // EL: torre acristalada vertical y planta baja vidriada. Las fotos que
        // parecían mostrar AH corresponden en realidad a EL y Puerta 2.
        rectangle(-69.962578, 18.487832, -69.962548, 18.488062, {
            id: 'el-glass-tower', material: 'glass', base: 0, height: 17.8
        }),
        rectangle(-69.962559, 18.487815, -69.962381, 18.487832, {
            id: 'el-ground-glass-plaza', material: 'glass', base: 0, height: 3.35
        }),
        rectangle(-69.962559, 18.488060, -69.962381, 18.488077, {
            id: 'el-ground-glass-street', material: 'glass', base: 0, height: 3.35
        }),
        rectangle(-69.962559, 18.487815, -69.962381, 18.487827, {
            id: 'el-charcoal-fascia', material: 'charcoal-band', base: 3.18, height: 3.82
        }),

        // AJ: la foto 1 corresponde a esta escalera, no a AH. El acento ocupa
        // sólo el vacío central y evita teñir de rojo todo el edificio.
        rectangle(-69.963925, 18.487672, -69.963882, 18.487694, {
            id: 'aj-red-stair-core', material: 'stair-red', base: 0, height: 8.6
        }),

        // DP: solo se conserva el acceso de LibrINTEC cuya posición sí está
        // respaldada. El acento vertical previo rebasaba la huella del edificio.
        rectangle(-69.962145, 18.487785, -69.962082, 18.487812, {
            id: 'librintec-red-entry', material: 'brand-red', base: 0, height: 4.2
        })
    ]
};

export const campusStairs = {
    type: 'FeatureCollection',
    features: Array.from({ length: 11 }, (_, index) => {
        const lng = -69.962164 + index * 0.0000129;
        return line([
            [lng, 18.487755], [lng, 18.487915]
        ], { id: `biblioteca-step-${index + 1}`, kind: 'library-step' });
    })
};

// Paso peatonal confirmado por las vistas opuestas AH–FD–GC y por el eje OSM.
export const campusCrosswalks = {
    type: 'FeatureCollection',
    features: [
        line([
            [-69.9632957, 18.4878312],
            [-69.9630453, 18.4878338]
        ], { id: 'p3-central-crosswalk', kind: 'zebra' })
    ]
};

export const campusCanopies = {
    type: 'FeatureCollection',
    features: [
        polygon([
            [-69.962165, 18.487790], [-69.962095, 18.487810], [-69.962130, 18.487860]
        ], { id: 'bib-dp-canopy-west', material: 'white-canopy', base: 2.65, height: 2.9 }),
        polygon([
            [-69.962095, 18.487810], [-69.962030, 18.487790], [-69.962055, 18.487855]
        ], { id: 'bib-dp-canopy-east', material: 'white-canopy', base: 2.65, height: 2.9 })
    ]
};

export const campusAccessibility = {
    type: 'FeatureCollection',
    features: [
        rectangle(-69.962168, 18.487594, -69.962065, 18.487614, {
            id: 'dp-accessible-ramp', material: 'accessible-blue'
        }),
        rectangle(-69.961105, 18.487604, -69.960995, 18.487624, {
            id: 'ep-accessible-ramp', material: 'accessible-blue'
        }),
        rectangle(-69.962168, 18.487594, -69.962150, 18.487614, {
            id: 'dp-tactile-cap', material: 'tactile-yellow'
        }),
        rectangle(-69.961105, 18.487604, -69.961087, 18.487624, {
            id: 'ep-tactile-cap', material: 'tactile-yellow'
        })
    ]
};

export const campusPergolas = {
    type: 'FeatureCollection',
    // La referencia disponible solo dice "probable DP"; se reincorpora cuando
    // una vista aérea o una verificación de campo confirme su ubicación.
    features: []
};
