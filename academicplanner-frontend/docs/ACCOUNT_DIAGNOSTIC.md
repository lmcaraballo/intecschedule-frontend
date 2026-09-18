# Prueba autorizada de cuenta y soporte de correo institucional

> Actualización: el backend propio ya consulta correctamente esta cuenta en BeeCampus y devuelve 11 reuniones. El siguiente diagnóstico corresponde al backend AWS anterior, que no se modificó. Ver `academicplanner-backend/README.md` en la raíz del proyecto.

Fecha: 2026-09-18. Cambios locales; sin push, PR, merge ni despliegue cloud.

## Diagnóstico confirmado

La cuenta proporcionada por el usuario se autentica correctamente. La consulta posterior de horario falla en el servicio desplegado:

| Prueba real | Login | Horario |
| --- | --- | --- |
| A través del proxy local Docker | 200, 2.840 s | 502, 4.184 s; PORTAL_STRUCTURE_CHANGED |
| Directamente al backend de desarrollo | 200, 2.780 s | 502, 3.259 s; PORTAL_STRUCTURE_CHANGED |
| Formulario actualizado usando correo institucional | 200 | 502; error controlado visible |

El fallo existe sin frontend ni proxy: no lo causa la validación local del JSON del horario. El servicio responde con error antes de entregar clases. El código indica que el backend no pudo interpretar el portal; la causa interna exacta no puede determinarse sin su implementación y diagnóstico del servidor. No se ha demostrado que el HTML haya cambiado ni que la cuenta carezca de horario.

En la prueba real del formulario se comprobó además: contraseña vaciada tras enviar, localStorage vacío y sessionStorage vacío después del fallo. No se tomaron capturas ni trazas del acceso real. No se registraron cuerpos de autenticación ni tokens.

El usuario confirmó que no dispone del código del backend. Por ello este error permanece abierto y bloquea la consulta real de horario de esta cuenta. No se sustituyó el fallo por un horario vacío ni por información simulada.

## Corrección del frontend

- Se acepta matrícula o correo de estudiante con forma `matricula@est.intec.edu.do`.
- Se eliminan espacios externos y se admite el dominio en mayúsculas/minúsculas.
- Solo se envía la matrícula al backend y se utiliza esa misma matrícula al verificar el estudiante de la respuesta.
- Se rechazan correos de otro dominio, direcciones incompletas, dominios con sufijos adicionales y correos institucionales sin matrícula numérica. Se muestra una explicación antes de contactar al servidor.
- La contraseña conserva exactamente sus caracteres, incluidos espacios significativos.
- Se añadió ayuda junto al campo. El error de lectura ahora explica: «El servicio no pudo leer tu horario en el portal institucional. Inténtalo más tarde.»

## Credenciales de prueba

El archivo `.env` de pruebas está fuera del repositorio y de la carpeta que Vite compila, dentro de `work/private-tests`. Directorio privado y archivo con permisos 600; exclusión adicional mediante `.gitignore`. Solo los scripts de diagnóstico lo cargan explícitamente. No tiene variables `VITE_*` y no se incluye en ZIP, Docker, evidencias ni documentación.

El usuario completó la contraseña directamente en el archivo. No se copia aquí su contenido. La excepción autorizada para pruebas no modifica la política de la aplicación: la UI no guarda contraseñas ni tokens. El archivo privado se conserva para las pruebas solicitadas.

## Verificación

- 195 pruebas unitarias/integración aprobadas.
- 14 pruebas de navegador HTTP aprobadas, incluidas correo normalizado y rechazo previo de otros dominios.
- 25 pruebas de navegador de regresión aprobadas: responsive, accesibilidad automatizada, offline/PWA, almacenamiento y navegación.
- Compilaciones mock/HTTP y nueva imagen Docker aprobadas.
- Prueba real de navegador con correo institucional: login exitoso, error del backend reproducido, credenciales no persistidas por la aplicación.
- `git diff --check` sin errores.

La aplicación actualizada permanece en `http://127.0.0.1:4293`. Si se muestra una versión anterior en una pestaña que ya estaba abierta, recargar para recoger la actualización.

## Informe para el responsable del backend

**Problema:** el backend de desarrollo acepta `POST /user/login` (200), pero `POST /schedule` usando el accessToken recién obtenido responde 502 con `{ "error": { "code": "PORTAL_STRUCTURE_CHANGED" } }`.

**Reproducción:** autenticarse con la cuenta autorizada y consultar inmediatamente el horario con Bearer. La prueba directa y la prueba mediante proxy producen el mismo resultado; no es un problema de CORS, timeout del frontend ni prefijo `/dev`.

**Esperado:** respuesta 200 con `{student,fetchedAt,classes}` si se puede leer el horario. Si la cuenta tiene un estado especial, el servidor debe distinguirlo del fallo de interpretación. Un error no debe convertirse en una lista vacía.

**Siguiente paso:** revisar el punto del lector institucional que genera `PORTAL_STRUCTURE_CHANGED` para esta cuenta, identificar la respuesta del portal que no puede procesar y corregir el backend. No se dispone del código necesario en este proyecto. Coordinar la prueba con el usuario sin incluir su contraseña o tokens en el reporte.
