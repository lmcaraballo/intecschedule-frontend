# AcademicPlanner — revisión final local del 25 %

> Actualización posterior: el backend de desarrollo ya fue proporcionado y el adaptador fue actualizado. Consultar [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) para el estado vigente (186 pruebas de lógica y 37 de navegador); los resultados siguientes corresponden a la auditoría previa.

**READY FOR 25% DELIVERY** — primer incremento con consulta institucional simulada.

## Resultado vigente

Esta segunda auditoría partió del commit `1a7f2a7`, con 169 pruebas y build correctos. Encontró 4 defectos nuevos: 0 Critical, 2 High, 2 Medium, 0 Low. Los 4 fueron corregidos y vueltos a probar; 0 pendientes. Historial acumulado: 11 defectos corregidos (3 High, 7 Medium, 1 Low).

- `npm test`: **176/176** (12 archivos).
- `npm run build`: **correcto**, modo demo y HTTP comprobados durante las suites.
- `npm run typecheck`: **correcto**.
- `npm run lint`: **no existe**; no ejecutado ni sustituido por una afirmación de lint.
- `npm run test:e2e`: **25/25**.
- `npm run test:e2e:http`: **9/9**.
- `npm audit`: **0 vulnerabilidades reportadas**.
- Se añadieron **7 tests unitarios/integración y 8 de navegador**.
- Persisten dos warnings no bloqueantes de anotaciones de Zod en el build; no se ocultaron.

## Cambios principales

1. Reflow al ampliar fuente al 200 %: cabecera, acceso, toolbar y días del horario.
2. Revalidación del almacenamiento al recuperar foco/visibilidad; cancelación tras borrado.
3. Boundary exterior para fallos de proveedores que el router no cubría.
4. Rechazo de consultas/snapshots antiguos, con evidencia entre dos pestañas.

Archivos principales: `src/storage/scheduleStorage.ts`, `src/services/consultSchedule.ts`, `src/app/App.tsx`, `src/app/AppErrorBoundary.tsx`, `src/theme/global.css`, `src/app/academic.css`, `src/features/auth/access.css`, tests de integración y suites `e2e/`.

No se encontraron nuevas filtraciones de contraseñas, vulnerabilidades npm conocidas ni defectos en las funciones de lógica temporal. Los problemas nuevos de almacenamiento/concurrencia y responsive/accesibilidad están corregidos. No se añadieron funcionalidades fuera del 25 %.

## Evidencia y riesgos

[Reporte QA](QA_25_REPORT.md), [correcciones](QA_25_FIXES.md), [matriz de riesgos](QA_25_RISKS.md), [handoff](FRONTEND_25_HANDOFF.md) y [despliegue](DEPLOYMENT.md).

La matriz mantiene como límites relevantes: integración institucional pendiente, otros motores y dispositivos, dependencia de timestamps fiables para ordenar snapshots entre pestañas, precaché necesario para offline, cambios de versión del service worker en despliegues reales y horario recurrente según reloj del dispositivo.

Se verificó zoom real Chromium 200 % (1280 px físicos lógicos de ventana → 640 CSS px, DPR 2), además del aumento de fuente, ocho anchos, teclado, contraste automatizado, refresh de detalle y rutas desconocidas. Las pruebas no constituyen certificación completa WCAG.

## Git

Rama local: `qa/academicplanner-frontend-25`. Esta ronda conserva los cambios locales sobre `1a7f2a7`; no crea un nuevo commit.

**No se hizo push, no se creó PR, no se mergeó ni se modificaron ramas remotas.** Tampoco se repitió el dry-run de publicación de la ronda anterior. La restricción actual es mantener toda la auditoría local, independientemente de los permisos disponibles.

El ZIP de esta revisión incluye los cambios locales actuales; el bundle/ZIP de la entrega anterior no los incluye. La infraestructura AWS preexistente se conserva.
