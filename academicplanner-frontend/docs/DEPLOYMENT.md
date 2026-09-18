# AcademicPlanner — integración y despliegue

## Decisión de integración

El navegador realiza **POST `/api/user/login`** con `{studentId,password}` y después **POST `/api/schedule`** con `Authorization: Bearer <accessToken>`, sin cuerpo. El proxy elimina `/api` y conserva la URL base del backend (incluido `/dev`). El [OpenAPI](openapi.json) es una copia del contrato publicado por el backend de desarrollo el 2026-09-18. Ver [validación de la integración](BACKEND_INTEGRATION.md).

La respuesta plana `{student,fetchedAt,classes}` se valida y transforma al modelo interno `{student,schedule:{fetchedAt,classes}}`. No requiere migración del horario guardado. El token de acceso vive únicamente durante la consulta; no se persisten tokens ni se utiliza renovación automática. El PDF incluye instrucciones de persistencia que no sustituyen la restricción del proyecto.
El repositorio remoto indicado contiene infraestructura AWS CDK, no la aplicación local. Esta entrega incorpora `academicplanner-frontend/` sin reemplazar los stacks ni el backend existente. Los comandos siguientes se ejecutan dentro de esa carpeta. El contrato de usuarios que ya existe en la raíz no equivale al endpoint académico nuevo.

## Desarrollo con el backend

1. Instalar Node.js 22.12 o superior y ejecutar `npm ci`.
2. Copiar `.env.example` a `.env.local`.
3. Definir `VITE_ACADEMIC_API_MODE=http` y `API_PROXY_TARGET` con `https://03lghnqjli.execute-api.us-east-1.amazonaws.com/dev` (desarrollo) o la URL base del servidor que corresponda.
4. Ejecutar `npm run dev`. Vite elimina `/api` y reenvía al backend: `/api/user/login` → `/dev/user/login`.
5. Probar éxito, credenciales inválidas, portal caído, respuesta inválida y timeout. Confirmar que un fallo conserva el horario previo.

La matrícula/contraseña se envían temporalmente en el cuerpo JSON. No se guardan, registran ni ponen en variables de entorno. Las variables `VITE_*` son públicas. `API_PROXY_TARGET` se usa solo en el servidor de desarrollo. Cambiar el modo exige reiniciar Vite o reconstruir.

Un modo desconocido (por ejemplo `htpp`) detiene el build: evita publicar por error una demo creyendo que está conectada. `mock` es el valor predeterminado para desarrollo; Docker usa `http` de manera predeterminada.

## Producción con Docker y proxy incluido

```sh
docker build -t academicplanner:review .
docker run --rm -p 127.0.0.1:8080:8080 \
  -e API_UPSTREAM=https://03lghnqjli.execute-api.us-east-1.amazonaws.com/dev \
  academicplanner:review
```

La URL anterior es de desarrollo. Para producción, sustituirla por la **URL base del backend**, con su prefijo de etapa si corresponde y sin query, credenciales ni barra final. Si ambos servicios viven en una red Docker, usar el nombre del servicio y su puerto; `localhost` dentro del contenedor apunta al propio contenedor. La imagen se niega a iniciar sin un upstream HTTP/HTTPS. `API_UPSTREAM` es configuración de ejecución: se puede cambiar sin reconstruir el frontend.

El puerto interno es 8080. Terminar HTTPS en el balanceador/proxy de producción y dirigir todo el dominio a este contenedor. La PWA necesita HTTPS fuera de localhost. Si el proxy exterior necesita gestionar `X-Forwarded-Proto`, ajustar ese encabezado a la topología real; aquí no se aceptan cookies institucionales del cliente.

Configuración incluida:

- Rutas SPA como `/ahora` y `/horario` devuelven `index.html` al recargar.
- `/api/*` va al backend quitando `/api`; `/api` devuelve 404. Ninguno recibe el HTML de la SPA.
- Archivos inexistentes devuelven 404.
- Assets con hash: caché larga; HTML, service worker y manifiesto: revalidación.
- API: `Cache-Control: no-store`, sin cache de proxy ni cookies devueltas al cliente.
- Timeout del cliente: 20 s. Timeout de lectura del proxy: 25 s. El backend debe terminar y limpiar sus recursos por su cuenta.
- `/healthz` comprueba el servidor estático; **no certifica** la salud del portal ni del backend.
- No se registran cuerpos de consulta. El endpoint tiene access log deshabilitado.

Para construir una imagen de demostración usar `--build-arg ACADEMIC_API_MODE=mock`. No presentarla como integración institucional real. El upstream sigue siendo obligatorio en esta plantilla de producción.

Las imágenes base usan tags mantenidos; antes de una publicación operativa, el equipo puede fijar los digest aprobados por su proceso de despliegue. No se ha desplegado en una cuenta cloud durante esta revisión.

## Hosting estático sin Docker

```sh
npm ci
VITE_ACADEMIC_API_MODE=http npm run build
```

Publicar **el contenido de `dist/` en la raíz del dominio**, no en una subcarpeta de GitHub Pages. Este incremento usa rutas e iconos absolutos y scope PWA `/`. Configurar en el hosting la reescritura SPA y un proxy `/api/*` hacia la URL base del backend, quitando `/api` y conservando `/dev` si corresponde, excluyéndolo de caché y de la reescritura. `npm run preview` solo sirve para revisión local y no incluye el proxy de producción.

La imagen Docker ya resuelve esas reglas. Si se usa S3/CloudFront u otro hosting, reproducirlas allí: no bastará con subir `dist/` si se quiere acceso al backend o recarga de rutas profundas. No modificar los stacks AWS existentes sin confirmar el destino y la cuenta del equipo.

## Comprobaciones antes de publicar

```sh
npm ci
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run test:e2e:http
VITE_ACADEMIC_API_MODE=http npm run build
```

No ejecutar ambas suites de navegador a la vez: comparten `dist/`. La primera reconstruye en modo demo; la segunda en modo HTTP y sustituye respuestas con un servidor simulado a nivel de navegador. Los datos y contraseñas de pruebas son ficticios. No hay script lint; no se informa como ejecutado.

La primera auditoría comprobó Docker con un backend de prueba. Los resultados del adaptador actualizado y la comprobación del backend compartido están en [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md). Las pruebas controladas no certifican autenticación ni scraping institucional.

## Validación pendiente con backend

Introducir credenciales válidas directamente en la aplicación local y comprobar un horario real. No copiarlas al chat, scripts, logs ni archivos. Confirmar el límite total de 20 s y que los códigos de error del portal estén normalizados. El horario vacío debe representar éxito real; `isPino` proviene del backend. Ahora entiende domingo, pero Horario mantiene lunes–sábado según el alcance actual. El frontend no incluye base de datos ni dependencias del HTML del portal.
