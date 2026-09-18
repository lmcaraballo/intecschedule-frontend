# AcademicPlanner — Entrega Frontend 25%

## 1. Objetivo del incremento

Entregar la base de una PWA de organización académica: acceso temporal, consulta y conservación del horario, contexto académico en Ahora y exploración en Horario. «25%» identifica este alcance acordado; no mide automáticamente el avance de todo el producto. Se conserva la arquitectura e identidad de AcademicPlanner.

## 2. Qué se implementó

**Completamente funcional en el frontend:** formulario validado; carga y errores comprensibles; validación externa con Zod; guardado del último horario válido; Ahora dinámico; Horario Día/Semana de lunes a sábado; detalle de solo lectura; navegación móvil/escritorio; temas; recuperación local; indicadores offline; limpieza confirmada en Más; reacción a cambios de almacenamiento entre pestañas.

**Simulado mediante mocks:** autenticación institucional, consulta del portal, perfil `isPino: true` de demostración y ocho clases ficticias. El selector ofrece éxito, credenciales inválidas, portal no disponible, horario no encontrado, vacío confirmado y respuesta incompleta. No usar contraseñas reales en la demostración.

**Preparado pero sin integración real:** adaptador HTTP, contrato de éxito/error, configuración para sustituir el mock, tipo de vista Mes, destino informativo Eventos y ayuda contextual de Campus. No hay backend, scraping, mapa, registro ni cuentas propias implementados.

## 3. Arquitectura del frontend

| Ruta | Responsabilidad |
| --- | --- |
| `src/app/` | Configuración, rutas, proveedores y guardia basada en datos locales. |
| `src/components/` | Controles reutilizables, tarjetas, navegación, estados y diálogo accesible. |
| `src/features/auth/` | Formulario, esquema de credenciales y coordinación del acceso. |
| `src/features/now/` | Presentación del contexto académico actual. |
| `src/features/schedule/` | Dominio temporal puro, colores, vistas y detalle. |
| `src/features/preferences/` | Preferencias y limpieza local en Más. |
| `src/services/` | Fachada `academicApi`, transporte HTTP, contrato, errores y transacción `consultSchedule`. |
| `src/storage/` | Único acceso a localStorage, validación y suscripciones. |
| `src/types/academic.ts` | Modelos y esquemas académicos compartidos. |
| `src/mocks/` | Servicio simulado y datos ficticios, encapsulados. |
| `src/theme/` | Tokens, estilos y temas contextuales. |
| `src/utils/` | Fechas, reloj, conexión y espera cancelable. |
| `src/test/` y `*.test.ts(x)` | Configuración y pruebas junto al código. |

Rutas: `/` acceso, `/acceso` redirige a `/`, `/ahora`, `/horario`, `/eventos` informativo y `/mas` para datos locales. Rutas desconocidas vuelven al acceso. Las rutas académicas requieren un horario local validado; esta condición **no es autenticación del servidor**. `?class=<id>` abre el detalle. Horario conserva fecha/vista con `?date=YYYY-MM-DD&view=day|week`.

La UI consume modelos normalizados. No conoce HTML, cookies, scraping ni sesiones institucionales. `useAcademicAccess → consultSchedule → academicApi → mock/HTTP → validación → scheduleStorage` separa presentación, consulta y persistencia.

## 4. Flujo de acceso actual

```text
Acceso → validación de campos → consulta → validación de respuesta y perfil
       → almacenamiento del horario válido → /ahora
```

La matrícula se recorta en los extremos; la contraseña no se recorta, pero se rechaza si contiene únicamente espacios. Se limpia el campo al enviar una solicitud válida. Las etapas visibles son «Verificando acceso…», «Consultando tu horario actualizado…» y «Organizando tus clases…». En modo HTTP describen fases del cliente; no son telemetría ni progreso real del scraping.

`consultSchedule` valida antes de guardar y comprueba que `student.id` corresponde a la matrícula solicitada. Solo navega tras un guardado correcto. Una consulta cancelada no escribe. Al desmontar el acceso o borrar los datos locales se cancela la petición pendiente. La referencia de credenciales propiedad del formulario se limpia al finalizar la operación, también cuando falla.

## 5. Modelo de datos

Tipos inferidos de los esquemas Zod reales en `src/types/academic.ts`:

```ts
interface StudentProfile {
  id: string;
  isPino: boolean;
}
interface AcademicClass {
  id: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  professor?: string;
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
}
interface Schedule {
  fetchedAt: string;
  classes: AcademicClass[];
}
interface AcademicSession {
  student: StudentProfile;
  schedule: Schedule;
}
```

Reglas del contrato:

- `student.id`: cadena no vacía, máximo 64 caracteres; devolver la matrícula normalizada enviada por el cliente.
- `isPino`: booleano obligatorio, nunca inferido por la UI.
- Identificadores, código y asignatura: cadenas con contenido después de recortar espacios. La sección es una cadena requerida que puede estar vacía si no está disponible; se muestra «Sección por confirmar». Cada `AcademicClass.id` es **único dentro del horario**, preferiblemente estable entre consultas. Una materia con varias sesiones necesita un ID por sesión.
- `professor` y `location` son opcionales; omitirlos si faltan, no enviar `null`. La UI muestra «Por confirmar».
- `day`: entero ISO, lunes = 1, …, domingo = 7. El modelo y Ahora admiten domingo, pero este incremento de Horario solo presenta lunes a sábado. Acordar una ampliación antes de depender de domingo en esa vista.
- Horas `HH:mm`, de `00:00` a `23:59`; fin estrictamente posterior al inicio. Clases que crucen medianoche requieren normalización o un cambio de contrato futuro.
- `fetchedAt`: fecha ISO 8601 con zona explícita, `Z` o desplazamiento `±HH:mm`. Por ejemplo `2026-09-18T07:30:00-04:00`; no se acepta una hora sin zona.
- `classes: []` es éxito **solo si se confirmó un horario sin clases**. No usar una lista vacía para ocultar fallos de autenticación, scraping o interpretación.
- Los campos adicionales se eliminan al proyectar los modelos. No deben enviarse secretos, aunque el cliente descarte extras.

## 6. Almacenamiento local

Única clave: **`academicplanner:data:v1`**.

```ts
{
  version: 1,
  session: AcademicSession | null,
  preferences: { theme: 'auto' | 'day' | 'night' }
}
```

`session` incluye perfil, clases y `fetchedAt`; puede ser `null` si solo se eligió un tema. Se actualiza tras una consulta completamente validada o un cambio de preferencias. `savePreferences` no sobrescribe registros corruptos/inaccesibles. `read()` distingue `ready`, `empty`, `corrupt` y `unavailable`; `get()` devuelve datos válidos o `null`.

Más → Limpiar datos locales → Borrar mis datos locales llama a `clearAcademicPlannerData()` de `src/storage/scheduleStorage.ts`. Elimina únicamente esta clave, restablece preferencias, actualiza otras pestañas y devuelve al acceso. `scheduleStorage.clear()` tiene el mismo efecto. No usar `localStorage.clear()` en producción: afectaría otras aplicaciones del mismo origen.

Nunca guardar contraseña, tokens, cookies, sesión del portal, HTML institucional, errores internos ni datos derivados. Los componentes no llaman localStorage directamente. El precaché de archivos estáticos permanece después de limpiar datos; no contiene el horario.

## 7. Datos derivados

`src/features/schedule/scheduleDomain.ts` calcula desde `Schedule + Date`:

- `getTodayClasses`: filtra y ordena sin mutar.
- `getCurrentClass`: inicio inclusivo y final exclusivo; ante coincidencias usa el orden estable.
- `getNextClass`: inicio estrictamente futuro, hasta la siguiente semana; devuelve clase y fechas de ocurrencia o `null`.
- `getFreeTimeUntilNextClass`: minutos redondeados hacia arriba; `null` durante una clase o sin próxima clase.
- `getDayStatus`: `before`, `during`, `between`, `finished` o `empty`.
- `getClassProgress`: porcentaje limitado entre 0 y 100.

No se almacenan `currentClass`, `nextClass`, tiempo libre ni estado del día. El reloj se refresca al cambiar de minuto, recuperar foco o visibilidad. Horario recurrente semanal y hora local del dispositivo; todavía no incorpora vigencia, feriados, cancelaciones ni conversión automática a la zona del campus cuando el estudiante viaja.

## 8. Integración con backend

`academicApi.fetchSession(credentials, options)` es la única fachada para consultar. `FetchOptions` acepta `signal`, `onProgress` y `scenario` (este último solo afecta al mock). Su retorno se trata como externo/no confiable y se valida antes de persistir.

Transporte preparado: `src/services/academicHttp.ts`.

```http
POST /api/academic/schedule
Content-Type: application/json
Accept: application/json
```

```json
{
  "studentId": "1127998",
  "password": "CONTRASENA_FICTICIA_SOLO_PARA_EJEMPLO"
}
```

Request validado: matrícula de 1–64 caracteres tras trim; contraseña de 1–256 caracteres sin trim y con al menos un carácter no blanco. El cuerpo no contiene preferencias, `scenario` ni estado de UI.

Respuesta **HTTP 200**, `Content-Type: application/json`, `Cache-Control: no-store`:

```json
{
  "student": { "id": "1127998", "isPino": false },
  "schedule": {
    "fetchedAt": "2026-09-18T07:30:00-04:00",
    "classes": [
      {
        "id": "IDS325L-01-thu-0800",
        "subjectCode": "IDS325L",
        "subjectName": "Aseguramiento de la Calidad del Software",
        "section": "01",
        "professor": "Nombre profesor",
        "day": 4,
        "startTime": "08:00",
        "endTime": "10:00",
        "location": "FD-301"
      }
    ]
  },
  "source": { "status": "ok" }
}
```

`source` es opcional. Si existe, `status` debe ser `ok`; se elimina antes de almacenar. Una respuesta con otro estado no se admite como éxito. El backend no necesita replicar funciones, demoras ni escenarios internos del mock.

Error: HTTP no exitoso, JSON mínimo y también `Cache-Control: no-store`:

```json
{ "error": { "code": "INVALID_CREDENTIALS" } }
```

Convención propuesta: 401 `INVALID_CREDENTIALS`, 503 `PORTAL_UNAVAILABLE`, 404 `SCHEDULE_NOT_FOUND`, 502 `PORTAL_STRUCTURE_CHANGED`/`INVALID_RESPONSE`, 500 `UNKNOWN_ERROR`. Para un request mal formado: 400 con `UNKNOWN_ERROR`; no intentar autenticarse. El frontend interpreta `error.code`, no depende de textos ni de un status particular para cada código. No enviar errores con HTTP 200.

El cliente usa `credentials: 'omit'`, `cache: 'no-store'`, `redirect: 'error'`, cancelación y tiempo máximo de 20 segundos. No envía Authorization ni cookies del portal. Se requiere mismo origen o proxy inverso; CORS entre orígenes no está configurado. No hay reintentos automáticos: el estudiante decide reintentar. Error de red/timeout se muestra como indisponibilidad; HTML, JSON inválido o estructura inesperada no llegan a storage. El cliente nunca presenta un `message` o `stack` del backend.

## 9. Responsabilidades del backend

Servicio pequeño y **stateless**:

1. Recibir temporalmente matrícula y contraseña por HTTPS.
2. Validar el request antes de contactar al portal.
3. Crear una sesión temporal aislada por consulta.
4. Autenticarse en el portal institucional.
5. Consultar únicamente las páginas necesarias.
6. Obtener el horario.
7. Parsear su contenido.
8. Normalizarlo al contrato académico.
9. Validar la respuesta, sin convertir errores en horarios vacíos.
10. Determinar `isPino` con la regla que acuerde el equipo.
11. Devolver JSON normalizado.
12. Cerrar/destruir la sesión temporal en un bloque de finalización, tanto en éxito como en error, timeout o cancelación.
13. Descartar credenciales y referencias temporales.

No asumir base de datos de estudiantes, cuentas propias, registro, recuperación de contraseña, sincronización permanente, permisos para modificar el portal ni una API oficial existente. La implementación del parser/autenticación pertenece al backend, no a los componentes React. Una cancelación del cliente no garantiza que el servidor se haya detenido: el backend debe gestionar sus propios límites y limpieza.

## 10. Seguridad

**Contraseña:** vive solo durante la operación. No persistirla en base de datos, storage, caché, archivos, logs, trazas/APM, excepciones o respuestas. No registrar cuerpos del endpoint en servidor, proxy o herramientas de observabilidad. No incluirla en URLs. Ninguna variable `VITE_*` debe contener secretos: se incorpora al JavaScript público.

**Sesión del portal:** cookies aisladas por consulta; destruir al finalizar mediante `finally`. No convertirla en sesión permanente de AcademicPlanner ni devolverla al navegador.

**Errores:** códigos permitidos y mensajes humanos locales. No devolver HTML completo, credenciales, cookies, stack traces ni detalles internos. El frontend descarta campos adicionales antes de guardar, pero el backend debe evitarlos desde el origen.

**Cliente:** se vacía el campo al enviar y la referencia de solicitud al terminar; no hay logs de credenciales. JavaScript no permite garantizar borrado físico de cadenas de memoria: esto no es una promesa de borrado criptográfico. La contraseña solo forma parte del POST al activar HTTP. Los datos académicos locales son legibles por scripts del mismo origen; la guardia de rutas no sustituye autenticación. La limpieza no controla gestores de contraseñas externos.

## 11. Manejo de errores

| Código backend | Significado | Comportamiento frontend |
| --- | --- | --- |
| `INVALID_CREDENTIALS` | Acceso institucional rechazado. | «Revisa tu identificación o contraseña.» |
| `PORTAL_UNAVAILABLE` | Portal temporalmente inaccesible. | «El portal no está disponible en este momento. Inténtalo más tarde.» |
| `SCHEDULE_NOT_FOUND` | Acceso válido, pero sin horario utilizable encontrado. | «No encontramos un horario académico disponible.» |
| `PORTAL_STRUCTURE_CHANGED` | La página no se pudo interpretar con el parser esperado. | «No pudimos interpretar el horario recibido.» |
| `INVALID_RESPONSE` | Datos que no satisfacen el contrato. | «No pudimos consultar tu horario. Vuelve a intentarlo.» |
| `UNKNOWN_ERROR` | Fallo inesperado. | «No pudimos consultar tu horario. Vuelve a intentarlo.» |

La tabla describe `src/services/academicErrors.ts`. Códigos desconocidos se traducen a `UNKNOWN_ERROR`. `OFFLINE` es un estado local adicional, no un código requerido al servidor. Los fallos de storage tienen mensajes propios. En todos los fallos se conserva el horario válido previo; sin horario se explica que hay que reintentar.

## 12. Último horario válido

La respuesta se valida por completo antes de `scheduleStorage.save()`. Perfil incorrecto, IDs repetidos, horas inválidas, fuente en error, timeout, fallo del portal o cuota agotada no sustituyen el registro anterior. Se muestra cuándo se consultó y se ofrece «Continuar con horario guardado». Las vistas académicas indican que se está mostrando el último horario válido cuando se elige esa recuperación o se está offline.

Un horario vacío **confirmado** reemplaza el anterior porque es una respuesta válida. Un horario no encontrado es error y no lo reemplaza. No hay caducidad automática ni actualización en segundo plano. El estado transitorio de haber elegido recuperación no se persiste; `fetchedAt` siempre permanece visible.

## 13. PWA y modo offline

`vite-plugin-pwa` genera manifiesto, service worker y precaché de archivos estáticos y fuentes. Se registra en producción; usar `npm run build` y `npm run preview` para verificarlo en localhost. Instalación y service worker requieren HTTPS o localhost.

Tras una carga completa y con horario guardado, Ahora, Horario y Detalle usan los datos locales sin red; también puede recargarse la aplicación desde el precaché. «Sin conexión» no bloquea la navegación. Consulta/actualización sí requieren conexión. No se cachean peticiones al portal ni al endpoint académico.

Primer uso offline sin recursos descargados no puede abrir la PWA; sin horario previo no se inventan datos. `navigator.onLine` es una señal de conexión, no garantiza que el portal responda. Instalación, disponibilidad de storage y comportamiento de caché dependen del navegador. No afirmar sincronización permanente o en segundo plano.

## 14. Experiencia Pino

El modelo incluye `isPino: boolean`. Con valor `true`, Ahora y Detalle pueden mostrar ayuda para consultar el edificio/aula y un texto de Campus próximo. No existe onboarding ni mapa funcional. El mock usa `true` únicamente para demostrar esa presentación. La regla institucional de detección está **pendiente de definición por el equipo**, no debe inventarse a partir de la matrícula.

## 15. Tema contextual

Según hora local: `morning` 05:00–09:59, `day` 10:00–16:59, `sunset` 17:00–19:59, `night` 20:00–04:59. La arquitectura reconoce los cuatro; morning/sunset usan visualmente day. Se puede fijar día/noche o volver a Auto. Los colores y su significado permanecen estables.

Tokens: pino `#2F4F3A`, musgo `#556B4F`, salvia `#A8B89F`, miel `#C89B3C`, crema `#F6F3EA`, error `#B85450` (token existente `--color-error`), advertencia `#D9A441` y texto `#2E2E2B`. Pino identifica la marca, bosque aporta atmósfera, panal inspira organización y abeja se reserva como personalidad contextual. No se añadieron ilustraciones ni decoración nueva en esta revisión.

## 16. Pendiente para los siguientes incrementos

Eventos personales; detección y comunicación de conflictos; Google Calendar; Campus visual; experiencia Pino completa; conexión al backend real; vista Mes y pulido posterior. La vista Semana evita ocultar clases superpuestas usando listas, pero **no implementa un módulo de detección/alerta de conflictos**.

También quedan fuera de esta entrega GPS, base de datos, registro, recuperación de contraseña, calificaciones y estadísticas. Vigencia, feriados y cancelaciones requieren acordar evolución del contrato.

## 17. Cómo ejecutar el frontend

Node.js 22.12 o superior. Desde la carpeta `academicplanner-frontend`:

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Vite muestra la URL de desarrollo. Preview sirve `dist` después del build. `npm run test:watch` ejecuta pruebas en modo interactivo; `npm run typecheck` comprueba TypeScript. No existe script `lint` en este proyecto. El servidor de producción debe servir archivos estáticos y resolver rutas de SPA con `index.html`, excepto `/api/*`, que debe ir al backend.

## 18. Cómo conectar el backend posteriormente

1. Implementar el endpoint y los códigos descritos en las secciones 8–11. Confirmar regla Pino y semántica del horario vacío.
2. Publicarlo bajo el mismo origen en `/api/academic/schedule` mediante proxy inverso. En desarrollo se configura `API_PROXY_TARGET` en `.env.local`; el proxy de Vite ya está preparado, sin un puerto de backend predefinido. En producción se incluye una imagen Docker con Nginx y `API_UPSTREAM`. Ver [despliegue](DEPLOYMENT.md).
3. Copiar `.env.example` a `.env.local` y cambiar **`VITE_ACADEMIC_API_MODE=http`**. Reiniciar Vite o reconstruir el despliegue: es configuración de build, no un interruptor de runtime.
4. `src/services/academicApi.ts` selecciona entonces `fetchAcademicSession` de `academicHttp.ts`. El selector de escenarios desaparece en la pantalla de acceso. No cambiar componentes, dominio ni storage.
5. Mantener las pruebas por defecto en modo mock (`VITE_ACADEMIC_API_MODE=mock npm test` si el entorno local quedó en HTTP). Los tests del adaptador prueban HTTP por separado con `fetch` controlado.
6. Validar un caso de éxito, cada código, horario vacío, respuesta incompleta, cancelación y timeout contra el servidor real, confirmando ausencia de credenciales en logs y que el último horario no se pierde.

Ausencia de variable u otro valor usa mock. No hay URL remota inventada ni conexión institucional activada en esta entrega. Si el equipo cambia el endpoint, modificar únicamente `ACADEMIC_ENDPOINT` en `academicHttp.ts` y el contrato/documentación. No incluir claves ni contraseñas en `.env.example`.

## 19. Estado de calidad

La evidencia actual y el resultado de las pruebas están en [QA_25_REPORT.md](QA_25_REPORT.md), los cambios en [QA_25_FIXES.md](QA_25_FIXES.md) y la entrega en [FINAL_REVIEW.md](FINAL_REVIEW.md). Hay pruebas unitarias/integración, suites de navegador demo y HTTP, escaneo axe y un flujo de CI preparado para GitHub. No hay ESLint configurado; `typecheck` comprueba tipos/imports pero no sustituye un linter.

Las correcciones cubren validación de espacios, conservación de datos, metadatos vacíos, desbordamiento de detalle, clases simultáneas y exclusión de `/api` del fallback de la PWA. Los ejemplos [OpenAPI](openapi.json) se verifican contra los esquemas del frontend. Persisten dos advertencias no bloqueantes de anotaciones de Zod en el build.

La revisión automatizada no certifica WCAG ni cubre lector de pantalla/dispositivos físicos. La integración institucional real está pendiente; el HTTP se probó con respuestas controladas y el proxy con un backend de prueba.

## 20. Resumen para el compañero de backend

**El frontend necesita del backend lo siguiente:** un `POST /api/academic/schedule` que reciba temporalmente matrícula/contraseña y devuelva `AcademicSession` validado o `{ error: { code } }`, sin cookies, HTML ni secretos. Implementa primero validación, autenticación temporal y normalización; confirma cómo distinguir vacío de error y acuerda `isPino`. Destruye sesión y credenciales en todos los desenlaces. Sirve JSON con `Cache-Control: no-store`. Cuando esté disponible bajo el mismo origen, activa `VITE_ACADEMIC_API_MODE=http` y ejecuta juntos los casos de integración; las pantallas ya consumen ese contrato.
