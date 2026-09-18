# AcademicPlanner — revisión final del frontend 25%

Revisión: 18 de septiembre de 2026.

## Entrega

Frontend funcional para el incremento acordado: acceso simulado, Ahora, Horario Día/Semana, detalle de solo lectura, último horario válido, estados de error, offline y responsive. Se corrigieron **7 defectos**: 1 High, 5 Medium y 1 Low. No se encontraron Critical. Todos los casos corregidos se volvieron a probar; ver [informe QA](QA_25_REPORT.md) y [cambios](QA_25_FIXES.md).

## Resultados comprobados

- **169/169** pruebas unitarias e integración, **18/18** navegador demo, **8/8** navegador HTTP.
- Build mock y HTTP, comprobación TypeScript: correctos. No hay script lint.
- Ocho anchos entre 320 y 1440 px; datos largos, 20 clases, teclado y axe en ambas apariencias.
- PWA: reapertura offline desde precaché, navegación y reconexión.
- Docker/Nginx: imagen construida y ejecutada, rutas SPA, política de caché, POST por proxy y fallback ante 401 con servidor de prueba independiente.
- Proxy de desarrollo probado por HTTP; auditoría npm sin avisos conocidos.
- Dos warnings de anotaciones de Zod siguen presentes; no bloquean build.

La consulta del portal sigue simulada por defecto. La integración real no se declara terminada: el backend institucional no fue entregado. Las pruebas HTTP usan datos ficticios.

## Integración posterior

El integrante de backend debe implementar **POST `/api/academic/schedule`**, conforme al [OpenAPI](openapi.json) y al [handoff](FRONTEND_25_HANDOFF.md); confirmar `isPino`, semántica del vacío y límites de tiempo. En desarrollo activar `VITE_ACADEMIC_API_MODE=http` y `API_PROXY_TARGET`; en Docker configurar `API_UPSTREAM`. Ver [despliegue](DEPLOYMENT.md).

## Git y publicación

- Remoto: `https://github.com/lmcaraballo/intecschedule-frontend.git`.
- Base revisada: `c6bbfd6` (`main`). Esa versión contiene infraestructura AWS CDK.
- Rama preparada: `qa/academicplanner-frontend-25`.
- El frontend se incorpora en `academicplanner-frontend/`; se conservan todos los stacks y archivos originales de infraestructura. La raíz recibe un enlace a la app y un workflow de validación independiente.
- La cuenta disponible `meliodr` tiene lectura, pero **push=false**. No se ha subido esta entrega. No hay PR creado ni despliegue cloud.
- `git push --dry-run origin HEAD` también confirmó HTTP 403: permiso denegado a `meliodr`. No se publicó ningún ref.
- El commit local y su hash se incluyen en la entrega externa; también se proporciona un bundle Git para transportar la rama sin perder el historial.
- Para publicar, el propietario debe conceder permisos de escritura o publicar la rama desde una cuenta autorizada. No cambiar la historia ni usar force push.

## Límites de la evaluación

Chromium, datos de prueba y backend ficticio: no sustituyen Safari/Firefox, dispositivos físicos, lector de pantalla ni pruebas del portal real. Horario sigue mostrando lunes–sábado; la hora es la del dispositivo, sin feriados o vigencia académica. La infraestructura AWS preexistente no se desplegó ni se certifica en esta revisión.
