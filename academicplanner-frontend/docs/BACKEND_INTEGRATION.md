# AcademicPlanner — integración del backend de desarrollo

> Actualización: ya se probó el acceso con una cuenta real. Login 200, horario 502 PORTAL_STRUCTURE_CHANGED. Ver [ACCOUNT_DIAGNOSTIC.md](ACCOUNT_DIAGNOSTIC.md); la consulta de horario real sigue bloqueada en el backend.

Fecha: 2026-09-18. Cambios exclusivamente locales; sin push, PR, merge ni despliegue cloud.

## Resultado

**Adaptador y despliegue local verificados. Acceso institucional exitoso pendiente de prueba con credenciales válidas introducidas directamente en la aplicación.** Las pruebas controladas no se presentan como un login real.

Se conserva el alcance del primer incremento: acceso, consulta, Ahora, Horario, detalle y último horario válido offline. No se añade sesión permanente, cuentas, renovación persistente ni funciones del 75% restante.

## Fuente y diferencias resueltas

Backend proporcionado: `https://03lghnqjli.execute-api.us-east-1.amazonaws.com/dev/`.
Contrato consultado: [OpenAPI publicado](https://03lghnqjli.execute-api.us-east-1.amazonaws.com/dev/openapi.json); copia en `docs/openapi.json`.
Documento de referencia: `Path userlogin.pdf`, páginas 1–6, inspeccionadas visualmente. Sus capturas de tokens no se reutilizaron ni se incluyen en esta entrega.

| Tema | Antes / documento | Implementación actual |
| --- | --- | --- |
| Acceso | POST único propuesto `/api/academic/schedule` | POST `/api/user/login` con matrícula/contraseña; validar respuesta de token |
| Consulta | PDF dice GET `/schedule`; una captura muestra `/schedule/sync` | POST `/api/schedule` sin cuerpo, según contrato desplegado |
| Respuesta | Modelo interno anidado `schedule` | Validar respuesta plana y normalizar al modelo interno sin migrar storage |
| Proxy | Conservaba `/api` hacia backend | Quitar `/api`, conservar `/dev` de la URL base |
| Token vencido | Código nuevo sin traducción específica | Mensaje humano para `AUTHENTICATION_REQUIRED`, conservando horario local |
| Persistencia | PDF propone tokens en localStorage | Mantener restricción del proyecto: token temporal solo durante la operación, refresh token descartado |

La contraseña no se recorta y solo se envía en el login. El token no pasa a componentes, URL, logs ni almacenamiento; se usa en Authorization para el horario y se descartan referencias al terminar. JavaScript no garantiza borrado físico de cadenas. No hay renovación ni reintentos automáticos: cada consulta exige login. El límite total sigue siendo 20 s; el token documentado dura 900 s.

Los nombres truncados se muestran tal como llegan. Profesor vacío utiliza «Por confirmar». `isPino` y el día ISO provienen del backend. La fecha con microsegundos y offset se valida correctamente. No se guardó el identificador real del estudiante en fixtures.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Unitarias e integración, `npm test` | 186 aprobadas, 12 archivos |
| TypeScript, `npm run typecheck` | Aprobado |
| Build mock y HTTP (ejecutados por suites de navegador) | Aprobados |
| Navegador mock: responsive, accesibilidad axe, offline/PWA, errores, storage y navegación | 25 aprobadas |
| Navegador HTTP: login → horario, errores, conservación, dos pestañas y privacidad | 12 aprobadas |
| Horario equivalente al proporcionado, 12 clases, identidad ficticia | Días 0/4/1/4/2/1 clases lunes–sábado; semana con 12, detalle virtual y profesor vacío correctos |
| Vista móvil 390 px y escritorio 1440 px | Capturas revisadas; sin desbordamiento horizontal móvil ni errores de consola en el flujo |
| Imagen Docker actualizada | Construida localmente |
| Docker `/healthz`, SPA `/horario`, archivo inexistente | 200, 200 y 404 respectivamente |
| Docker `/api` | 404, sin fallback SPA |
| Backend real directo y a través de Vite/Nginx: `/health` | 200, `status: ok` |
| Backend real directo y a través de Vite/Nginx: POST `/schedule` sin token | 401, `AUTHENTICATION_REQUIRED` esperado |
| Login real a través de Nginx, JSON vacío sin datos personales | 422, faltan studentId/password; sin intento de acceso a una cuenta |
| API a través de Nginx | JSON, `Cache-Control: no-store`, TLS con verificación |
| `git diff --check` | Aprobado |

Las pruebas de transporte incluyen token ausente/incorrecto, tokenType inesperado, expiresIn inválido, error de sesión, rechazo de encabezados inválidos, cancelación entre login y consulta, timeout compartido entre ambas peticiones, JSON/HTML inválido, respuesta de otro estudiante y horarios vacíos. Ningún fallo reemplaza el último horario válido.

Durante la escritura de la prueba del profesor vacío, una expectativa inicial decía «Profesor no disponible», pero el texto existente válido es «Por confirmar». Se corrigió la expectativa; no se cambió la interfaz por esa diferencia.

No existe script lint. Dependencias sin cambios respecto de la auditoría anterior; no se repitió npm audit en este incremento. Persisten las advertencias de anotaciones de Zod del build, sin fallos de compilación.

## Cómo probar y desplegar

Consultar [DEPLOYMENT.md](DEPLOYMENT.md). El modo HTTP requiere un proxy del mismo origen; publicar únicamente los archivos estáticos sin proxy no basta. Vite usa `API_PROXY_TARGET`; Docker usa `API_UPSTREAM`. Ambas aceptan una URL base con `/dev`. Docker requiere la URL sin barra final y comprueba TLS.

La aplicación Docker local de esta revisión está disponible en `http://127.0.0.1:4293`. Introducir credenciales solo en su formulario. Comprobar login, horario esperado, recarga, consulta posterior y recuperación offline. No registrar las solicitudes con credenciales en trazas de pruebas reales.

Para reproducir después de reiniciar:

```sh
docker build -t academicplanner:review .
docker run --rm -p 127.0.0.1:4293:8080 \
  -e API_UPSTREAM=https://03lghnqjli.execute-api.us-east-1.amazonaws.com/dev \
  academicplanner:review
```

El backend compartido es de desarrollo. Para producción falta conocer el destino definitivo y validar autenticación real, latencia y comportamiento de errores del portal. No se afirma que el backend destruya sus sesiones o credenciales: su implementación interna no fue auditada.

## Archivos principales

- `src/services/academicHttp.ts`: flujo de dos llamadas, validación de token y normalización del horario.
- `src/services/academicErrors.ts`: acceso vencido.
- `src/services/academicHttp.test.ts`, `contractExamples.test.ts` y `e2e/http.spec.ts`: cobertura nueva.
- `vite.config.ts`, `deploy/default.conf.template`, `deploy/19-check-upstream.sh`: reescritura de prefijos y configuración de despliegue.
- `.env.example`, README, OpenAPI y documentación de integración/despliegue.

Las correcciones de las auditorías anteriores permanecen en la copia local. No se modificó la carpeta original de Descargas ni los stacks de infraestructura existentes. El estado de Git continúa local, con cambios sin publicar.
