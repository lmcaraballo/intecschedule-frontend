# Frontend 50 Campus

## Cambio incorporado

El frontend muestra la **maqueta 3D local** del campus de Intec Schedule cuando hay una clase activa o próxima en **Ahora**, y también dentro del detalle de la clase. Reutiliza MapLibre y la geometría local de edificios, techos, estacionamientos, accesos y vegetación del proyecto original; no es un mapa esquemático.

La información se deriva exclusivamente de `location`, que ya forma parte del horario. La función `resolveCampusBuilding` reconoce códigos confiables como `AJ-103`, `GC315` y `LABTI405`. Si el aula es virtual o no permite identificar el edificio, se informa el límite en vez de inventar una ubicación.

## Archivos relevantes

- `src/features/campus/campusBuildings.ts`: resolución segura del edificio desde el aula.
- `src/features/campus/Campus3DPreview.tsx`: integración React y ciclo de vida de la maqueta 3D.
- `src/features/campus/threeD/`: renderer MapLibre y geometría local portados de Intec Schedule.
- `src/features/campus/scratch/`: extractos locales usados para el contexto del campus.
- `src/features/now/NowPage.tsx`: inserta el mapa para la clase activa o siguiente.
- `src/features/schedule/ClassDetail.tsx`: inserta el mapa en el detalle.
- `src/mocks/academicSession.ts`: datos de muestra con edificios reconocibles.

## Configuración y contrato esperado del backend

La maqueta 3D no usa las claves antiguas de Mapbox, Google Maps o Cesium. Esas variables existían en el `.env` de Intec Schedule, pero no forman parte de esta integración y no se copiaron. El único recurso remoto del renderer es la tipografía pública de MapLibre; toda la geometría del campus se distribuye dentro del frontend.

Para no romper este comportamiento, el backend debe conservar el texto original de `location`. Puede añadir opcionalmente `campusBuildingCode` cuando pueda determinarlo con seguridad; valores admitidos inicialmente: `AJ`, `GC`, `FD`, `AH`, `PB`, `EL`, `EP`, `ER`, `LF`, `Biblioteca`.

No debe enviar un código estimado cuando el aula sea ambigua, virtual o no tenga edificio. El frontend seguirá usando `location` como respaldo.

## Estado del backend de Caraballo

El repositorio correcto es `lmcaraballo/intecschedule-backend`. La revisión de `develop` al 28 de septiembre de 2026 encontró rutas CRUD de eventos, pero están respaldadas por SQLite local y no incluyen OAuth de Google ni sincronización bidireccional. No se integraron en AcademicPlanner porque el alcance acordado no usa una base de datos propia. La especificación actual para calendario y responsabilidades está en [FRONTEND_50_CALENDARIO_Y_PREFERENCIAS.md](FRONTEND_50_CALENDARIO_Y_PREFERENCIAS.md).

## Límite del frontend

El frontend implementará la interfaz de eventos personales, validaciones de formulario, visualización de conflictos y consumo de la conexión de Google Calendar. Google Calendar será la persistencia de los eventos; los secretos y tokens nunca deben llegar al navegador ni a una base de datos propia.

## Verificación

La resolución de edificios cuenta con pruebas unitarias. El conjunto del frontend pasó 203 pruebas, verificación de tipos y compilación de producción después de la integración. La maqueta se verificó en navegador para la vista Ahora y para el detalle de clase.
