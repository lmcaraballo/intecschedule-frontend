# AcademicPlanner API

Backend local nuevo compatible con el frontend de AcademicPlanner. **Integración real verificada con la cuenta autorizada el 2026-09-18:** login 200, horario 200 y 11 reuniones obtenidas del Volante de Selección. El servicio nuevo es independiente del backend AWS anterior, que no se modificó.

El conjunto local también expone la integración completa de Google Calendar y el
calendario institucional que consume el frontend. Para habilitar OAuth, copia
`.env.example` a un archivo de entorno seguro o exporta
`GOOGLE_OAUTH_CLIENT_ID`; es un identificador público y nunca se necesita un
client secret en el navegador o en el repositorio.

## Ejecutar el conjunto local

Desde la raíz del repositorio:

```sh
docker compose -f compose.academicplanner.yml up --build -d
```

Frontend: http://127.0.0.1:4294. Backend accesible únicamente a través de `/api` en ese mismo origen. La aplicación anterior en 4293 no se sustituye.

Para detener solo este conjunto:

```sh
docker compose -f compose.academicplanner.yml down
```

No hay que copiar credenciales a Docker ni al frontend. Se introducen únicamente en el formulario. El usuario autorizó la prueba de su cuenta en BeeCampus y se verificó el flujo completo. Las pruebas locales usan datos ficticios y un proveedor sustituido explícitamente; no existe un modo servidor que acepte cualquier contraseña en producción.

## Contrato

- `GET /health`: salud del proceso, no certifica la disponibilidad del portal.
- `POST /user/login`: `{studentId,password}`; admite matrícula numérica y `matricula@est.intec.edu.do`. Devuelve accessToken, refreshToken, tokenType y expiresIn.
- `POST /schedule`: Authorization Bearer, sin cuerpo. Devuelve `{student,fetchedAt,classes}`. **Consume la sesión**, tanto en éxito como en fallo, y cierra la conexión institucional. La siguiente consulta requiere nuevo login.
- `POST /user/refresh-token`: rota ambos tokens mientras la sesión sigue vigente; no extiende su duración absoluta ni revive una sesión consumida. El frontend actual no necesita llamar esta ruta.
- `GET /calendar/config`: configuración pública de OAuth, sin secretos.
- `GET /calendar/institutional`: período, feriados e hitos revisados de INTEC.
- `GET|POST /events`, `PATCH|DELETE /events/{id}`: sincronización directa con Google, sin base de datos local. Los eventos personales se leen y escriben en el calendario principal del usuario; las clases van a **AcademicPlanner · Horario** y los recordatorios institucionales a **AcademicPlanner · INTEC**. El calendario heredado **AcademicPlanner** permanece legible para no perder eventos creados con versiones anteriores.

Tokens opacos aleatorios de 256 bits; el servidor indexa hashes y mantiene cookies institucionales solo en memoria. No se guardan contraseñas, horarios ni cookies en archivos o base de datos. Caducidad absoluta de 15 minutos; limpieza cada 30 segundos y al apagar. Un reinicio invalida todos los tokens.

**Una sola instancia y un solo worker** en esta versión. No usar múltiples workers/réplicas ni Lambda sin sustituir el almacenamiento de sesiones. Límite de 100 sesiones, cuatro operaciones institucionales simultáneas y ocho logins por minuto por dirección de conexión. Detrás del Nginx incluido ese último límite es compartido: antes de abrir a múltiples usuarios, implementar el rate limit por cliente en el proxy de confianza.

El login y la consulta tienen un máximo independiente de 15 segundos; el frontend limita el flujo completo a 20 segundos. Si el portal tarda más, la aplicación muestra indisponibilidad y conserva el último horario. No hay reintentos automáticos de contraseñas.

## Conector del portal

La URL oficial fue obtenida desde [Mi zona de INTEC](https://www.intec.edu.do/estudiantes/mi-zona). El usuario proporcionó las rutas de Mis Clases y del reporte `PUBLIC.CX_RE_VOL_SEL_ESTUDIANTE`; este último se eligió como fuente principal por sus columnas explícitas.

`app/portal.py` usa el formulario público observado (`userid`, `pwd`, campos ocultos incluido CSRF), cookies aisladas y redirecciones restringidas a HTTPS en beecampus.intec.edu.do. No acepta URLs del cliente. No reenvía cuerpos con credenciales en redirecciones 307/308.

El servidor del portal no entregó una cadena TLS completa en las comprobaciones públicas. Se incluyen certificados intermedios públicos de Sectigo obtenidos desde sus URLs AIA y verificados contra las raíces del sistema. La verificación TLS y del nombre del servidor permanece activa. `certs/intec-intermediates.pem` no contiene claves privadas; debe revisarse cuando el portal cambie su certificado.

**Verificado con la cuenta de prueba:** login con PS_TOKEN, navegación al iframe del reporte y envío de sus campos de estado junto con `InputKeys_STRM=2230`, `InputKeys_ACAD_PROG` vacío e `ICAction=#ICOK`. El reporte inicial tiene encabezados pero ninguna fila hasta pulsar «Ver Resultado»; ahora el conector completa ese paso. El POST está restringido a la consulta `CX_RE_VOL_SEL_ESTUDIANTE` bajo `/q/`.

El ciclo se configura con `ACADEMIC_TERM`. El Compose usa 2230, que el usuario mostró para agosto–octubre de 2026. Al cambiar el período, actualizar esa variable y recrear el backend. No se deduce el ciclo desde la fecha ni se inventan códigos institucionales. Sin un ciclo configurado o preseleccionado por el portal se devuelve `SERVICE_NOT_CONFIGURED`, no un horario vacío. La generalización a otras cuentas, programas y períodos requiere validación adicional.

Ejemplo para este período:

```sh
ACADEMIC_TERM=2230 docker compose -f compose.academicplanner.yml up -d --build
```

El sufijo `_14` proviene de la URL proporcionada y funcionó en la sesión comprobada. Una futura estructura distinta devuelve error controlado. Las respuestas comprimidas se descomprimen una sola vez: HTTPX ya decodifica `aiter_bytes`; al reconstruir la respuesta se retiran los encabezados de codificación originales.

## Parser y límites

`app/parser.py` identifica encabezados por nombre, no por posiciones fijas. Verifica matrícula, códigos, nombres, secciones, siete días, intervalos, IDs únicos y paginación completa. Divide las reuniones por día y genera IDs determinísticos. Conserva códigos, profesores y ubicación tal como los devuelve la fuente; no une automáticamente códigos históricos y actuales.

No inventa horas para «A anunciar»: conserva el componente con `reason=to_be_announced`. Las asignaturas con todas las celdas de días vacías se conservan en `unscheduledSubjects` y se muestran como componentes sin horario semanal en Ahora y Horario, sin inventar reuniones. Una etiqueta explícita de asincronía se conserva con `reason=asynchronous`; las celdas vacías sin esa evidencia usan `not_reported`, incluso si el aula dice VIRTUAL. Una misma fila puede conservar encuentros programados y componentes pendientes/asíncronos. Los textos de horas no reconocidos y las respuestas parciales siguen produciendo error. Una tabla vacía devuelve SCHEDULE_NOT_FOUND; no se interpreta silenciosamente como éxito vacío. `isPino=false` es el valor provisional hasta acordar una regla verificable. No consulta notas, pagos, selección ni modifica inscripciones.

## Pruebas y desarrollo

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
ACADEMIC_TERM=2230 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers
```

56 pruebas locales: contrato, correo/matrícula, redacción de errores, sesión de un solo uso, rotación, expiración, limpieza, límites, redirecciones, TLS restringido por origen, parser, calendario institucional y eventos de Google. La suite automatizada usa únicamente datos ficticios y no envía credenciales a INTEC. Además se hizo una prueba real autorizada del navegador: correo institucional normalizado, identidad coincidente, 11 reuniones (lunes–sábado: 0/3/2/3/2/1), detalle accesible, sin errores de consola ni desbordamiento móvil y sin contraseña/tokens en storage. El cliente de pruebas emite una advertencia de obsolescencia de Starlette; no afecta el resultado.

FastAPI publica `/openapi.json` y `/docs` para inspección local. Para publicar externamente: validar otras cuentas y períodos; configurar HTTPS, proxy de confianza y límites acordes al número de usuarios. No se cambió ni desplegó la infraestructura AWS CDK existente.

## Referencias técnicas

- [FastAPI: seguridad](https://fastapi.tiangolo.com/tutorial/security/).
- [HTTPX: configuración SSL](https://www.python-httpx.org/advanced/ssl/).

### Validación adicional de cuentas

Se reprodujo y corrigió el rechazo de una materia con las siete celdas de días vacías. Dos cuentas adicionales autorizadas pasaron login y consulta desde el navegador: una devolvió 10 reuniones; la otra, 9 reuniones y 1 materia sin horario. Se verificaron identidad, vistas diaria/semanal, detalle, aviso visible, ausencia de credenciales/tokens en storage y ausencia de errores de consola y desbordamiento a 390 px. Frontend: 200 pruebas; backend: 40. Esto valida estos casos, no todos los posibles formatos del portal.

Investigación y matriz de casos: [Modalidades y horarios INTEC](docs/INTEC_MODALIDADES.md).
