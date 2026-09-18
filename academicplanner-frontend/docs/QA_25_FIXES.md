# AcademicPlanner — correcciones de la revisión

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
