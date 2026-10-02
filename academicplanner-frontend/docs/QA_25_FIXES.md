# AcademicPlanner — correcciones de la revisión

> Actualización posterior: el backend de desarrollo ya fue proporcionado y el adaptador fue actualizado. Consultar [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) para el estado vigente (186 pruebas de lógica y 37 de navegador); los resultados siguientes corresponden a la auditoría previa.

Resultado vigente: segunda auditoría con **4 correcciones nuevas**, **176 unitarias/integración + 34 de navegador pasando**. Las cifras anteriores en el historial corresponden a la primera auditoría.

Se probaron primero los defectos y se repitieron los casos después de corregir. Los originales de Descargas permanecen intactos.

| ID | Antes | Después | Archivos principales |
| --- | --- | --- | --- |
| QA-001 | Contraseña con solo espacios se aceptaba. | Se pide contenido; se preservan espacios significativos de contraseñas reales. | `src/features/auth/authSchema.ts` |
| QA-002 | Código largo salía del detalle móvil. | Se envuelve dentro del diálogo en los ocho tamaños revisados. | `src/app/academic.css` |
| QA-003 | IDs, nombres y códigos con solo espacios podían reemplazar datos válidos. | Se recortan y validan antes de guardar; si quedan vacíos se conserva el horario previo. | `src/types/academic.ts` |
| QA-004 | Sección vacía rechazaba todo el horario; descripciones con espacios quedaban visualmente vacías. | La sección vacía es válida; textos se normalizan y muestran «Por confirmar». | `src/types/academic.ts`, `ClassCard.tsx`, `ClassDetail.tsx` |
| QA-005 | La PWA devolvía HTML al navegar a la API. | `/api` queda fuera del fallback del service worker y el proxy la deriva al servidor. | `vite.config.ts`, `deploy/default.conf.template` |
| QA-006 | Una segunda clase en curso se marcaba pendiente. | Cada fila usa sus propios límites de tiempo; tarjeta principal conserva selección estable. | `src/features/now/NowPage.tsx` |
| QA-007 | README enlazaba una revisión inexistente. | Se entrega la revisión final y se conectan los informes. | `README.md`, `docs/FINAL_REVIEW.md` |

## Preparación de integración y entrega

- Proxy de desarrollo configurable con `API_PROXY_TARGET` y validación de modo `mock/http` para detectar errores de configuración.
- Contrato OpenAPI y ejemplos comprobados automáticamente contra Zod.
- Docker de producción con Nginx, SPA y proxy API bajo el mismo origen, rutas profundas, reglas de caché y upstream configurable.
- 42 pruebas nuevas unitarias/integración y 26 de navegador. CI preparado, sin desplegar automáticamente.
- Frontend añadido en una carpeta independiente dentro del repositorio, conservando el CDK existente.

## Verificación

169 pruebas unitarias/integración, 18 de navegador demo y 8 HTTP pasan. Build y TypeScript pasan; no hay lint configurado. Nginx y el proxy se probaron realmente con un backend ficticio local. El backend institucional no se presenta como implementado.

## Segunda auditoría — correcciones nuevas

### QA-008 — Reflow con texto al 200 %
- Impacto: controles fuera del viewport y desplazamiento horizontal.
- Causa: cabecera y toolbar sin wrap, columnas de acceso rígidas y seis columnas de días incluso al ampliar texto.
- Corrección: wrapping, columnas con mínimo adaptable, marca que puede partirse y selector de días que refluye según tamaño del texto.
- Archivos: `src/theme/global.css`, `src/features/auth/access.css`, `src/app/academic.css`.
- Prueba posterior: cinco tamaños con texto 200 %, viewport de poca altura, detalle y targets; ocho anchos normales y zoom real de navegador 200 %.
- Estado final: Fixed; regresión final correcta.

### QA-009 — Revalidación al recuperar foco/visibilidad
- Impacto: datos eliminados/corruptos seguían mostrándose desde memoria.
- Causa: solo se escuchaban escrituras propias y eventos storage de otras pestañas.
- Corrección: comparar snapshot al volver al foco/visibilidad; emitir cambio solo si corresponde y limpiar listeners. Un borrado también cancela la consulta pendiente.
- Archivos: `src/storage/scheduleStorage.ts`.
- Prueba posterior: corrupción, eliminación, foco sin cambios, cleanup de listeners y eliminación durante loading; integración y navegador.
- Estado final: Fixed; regresión final correcta.

### QA-010 — Recuperación fuera del router
- Impacto: un fallo de un proveedor superior terminaba sin una pantalla recuperable.
- Causa: errorElement protege rutas, pero los proveedores están fuera de ese árbol.
- Corrección: boundary exterior pequeño, sin serializar la excepción ni tocar storage, con recarga al acceso.
- Archivos: `src/app/App.tsx`, `src/app/AppErrorBoundary.tsx`.
- Prueba posterior: excepción deliberada de ThemeProvider, texto privado ausente del DOM y horario idéntico antes/después.
- Estado final: Fixed; regresión final correcta.

### QA-011 — Descartar consultas atrasadas
- Impacto: una respuesta anterior podía reemplazar la más reciente.
- Causa: cada pestaña protege su doble envío, pero la escritura no comparaba la antigüedad de la respuesta.
- Corrección: revisión de consulta por instancia y rechazo de fetchedAt anterior para el mismo perfil. Comparación de instantes, respetando offsets. Se comunica el descarte sin exponer códigos internos.
- Archivos: `src/services/consultSchedule.ts`, `src/storage/scheduleStorage.ts`.
- Prueba posterior: respuestas diferidas, offsets, distinto perfil y dos pestañas en HTTP.
- Estado final: Fixed; regresión final correcta.

Se mantuvieron las correcciones anteriores. No se añadieron funcionalidades del 75 % restante ni se modificó el backend.
