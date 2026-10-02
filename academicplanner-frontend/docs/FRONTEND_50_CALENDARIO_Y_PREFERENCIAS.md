# Frontend 50: calendario académico, preferencias y clase terminada antes

## Resultado incorporado

AcademicPlanner ya no repite el horario semanal indefinidamente. El frontend incorpora los cuatro trimestres del año académico oficial **agosto de 2026–julio de 2027**, con feriados, asuetos de varios días, selección, retiro, evaluaciones y cierres. Cada horario importado sigue limitado al trimestre en que fue consultado. Las fechas institucionales se muestran en **Ahora**, **Horario** y el resumen anual de **Más**.

También se incorporó una vista mensual real. Resume las clases por día, distingue los encuentros virtuales, muestra hitos institucionales y permite abrir cualquier fecha en la vista diaria. Día, Semana y Mes comparten la misma fuente de horario y respetan feriados y límites del trimestre.

Preferencias ahora permite elegir la pantalla de inicio, la vista predeterminada del horario, densidad, tema, tamaño de texto, contraste reforzado, reducción de movimiento, mapa del campus, materias sin horario, fechas institucionales y recordatorios. Cada opción tiene efecto real y se conserva solo en el dispositivo del estudiante. Los registros guardados con la versión anterior se completan automáticamente con valores seguros sin perder el horario.

Cuando una clase termina antes, el estudiante puede elegir **Terminar clase ahora**, confirmar la acción y continuar con su día. La clase deja de aparecer como activa, conserva el horario institucional y queda marcada como “Terminaste antes” únicamente para esa fecha y ese estudiante.

La modalidad también se muestra por encuentro, no por asignatura. Si una misma materia es presencial un día y virtual otro, solo el encuentro virtual lleva la insignia **Virtual**, su detalle indica la modalidad y reemplaza el mapa por un acceso al Aula Virtual. El encuentro presencial conserva su aula y el edificio 3D correspondiente. Si BeeCampus solo envía el valor genérico `Aula`, se presenta **Aula por confirmar** y no se inventa un edificio en el mapa.

Los avisos institucionales futuros ahora indican **En N días** o **Mañana** y muestran la fecha exacta. El calendario fue contrastado con la publicación oficial de INTEC e incorpora el feriado del 16 de agosto, el cierre de retiro del 3 de octubre y el inicio de preselección del 6 de octubre.

La sección **Eventos** ya permite conectar Google Calendar, crear, editar, actualizar y eliminar actividades. Antes de guardar muestra si la hora coincide con una clase. En modo demostración usa memoria temporal; en modo HTTP consume el backend de Caraballo y Google es la única persistencia.

## Decisiones que no deben cambiarse

- No hay una base de datos propia para eventos ni horarios.
- No se guardan contraseñas, tokens de portal ni credenciales de Google en `localStorage`.
- El horario regular conserva sus días y horas, pero solo genera ocurrencias dentro de un período académico publicado.
- Una finalización anticipada es una preferencia local; no modifica una clase institucional ni se sincroniza como cambio de horario.
- El registro institucional está acotado al año oficial publicado. Conocer trimestres futuros no reutiliza el horario importado en otro período ni inventa clases.

## Archivos del incremento

- `src/features/institutional/institutionalCalendar.ts`: períodos, feriados e hitos institucionales versionados.
- `src/features/schedule/classLocation.ts`: detecta y etiqueta la modalidad de cada encuentro según su ubicación.
- `src/features/schedule/MonthSchedule.tsx`: construye la cuadrícula mensual accesible y abre cada fecha en su detalle diario.
- `src/features/schedule/scheduleDomain.ts`: aplica el calendario al horario y evita recurrencias fuera de período.
- `src/components/CurrentClassCard.tsx`: acción y confirmación para terminar una clase antes.
- `src/storage/scheduleStorage.ts`: preferencias y marcas locales de finalización anticipada, validadas y sin datos sensibles.
- `src/features/preferences/preferences.ts` y `PreferencesSettings.tsx`: contrato, valores predeterminados e interfaz ampliada de preferencias.
- `src/features/now/NowPage.tsx` y `src/features/schedule/SchedulePage.tsx`: comunican fechas institucionales y el límite del trimestre.
- `src/features/events/CalendarConnectionProvider.tsx`: carga Google Identity Services y mantiene el token únicamente en memoria.
- `src/features/events/calendarApi.ts`: contrato HTTP, validación de respuestas y adaptador temporal de demostración.
- `src/features/events/EventsPage.tsx`: conexión, formulario, conflictos, listado, edición y eliminación.

## Contrato implementado para Google Calendar

El calendario de Google es la fuente persistente de los eventos personales; no se usa SQLite ni otra base propia. Para activar la conexión fuera de la demostración hace falta la configuración OAuth:

1. Crear un cliente OAuth de Google para la URL final de AcademicPlanner y entregar únicamente el **client ID público**. Registrar también las URL de desarrollo autorizadas.
2. Solicitar los scopes mínimos `calendar.events` y, si se crea un calendario separado, `calendar.calendars`. El consentimiento debe explicar que se leen y modifican solo los eventos creados por AcademicPlanner.
3. El backend crea o localiza un calendario llamado **AcademicPlanner**. Todo evento propio lleva `extendedProperties.private.academicPlannerSourceId`, un UUID creado una vez por el frontend. Ese identificador y el `event.id` de Google evitan duplicados.
4. Sincronización de doble vía: cada entrada a Eventos vuelve a leer Google y las altas, ediciones y eliminaciones se envían inmediatamente. No se conserva una copia que pueda quedar desactualizada.
5. El calendario institucional es de una vía: INTEC → AcademicPlanner → eventos de solo lectura en el calendario AcademicPlanner. No debe sobrescribirse desde Google ni mezclarse con los eventos personales.
6. Nunca registrar cuerpos OAuth, códigos de autorización, encabezados `Authorization`, `refresh_token` ni contraseñas. Si se decide usar un backend para OAuth, debe usar PKCE y no persistir tokens; con esa restricción el usuario reconecta Google cuando expira la sesión.

## Configuración de Google Calendar en este proyecto

1. En Google Cloud, habilitar **Google Calendar API** para el proyecto elegido.
2. En **Google Auth Platform**, completar Branding, Audience y Data Access. Mientras la aplicación esté en modo Testing, añadir como usuarios de prueba las cuentas que conectarán su calendario.
3. Crear un cliente OAuth 2.0 de tipo **Web application**. En Authorized JavaScript origins registrar por separado los orígenes que realmente se usarán, porque Google distingue host y puerto:
   - `http://localhost`
   - `http://localhost:4294`
   - opcionalmente `http://127.0.0.1:4294`, si también se probará con la IP de loopback
   - el origen HTTPS de producción, cuando esté disponible
   Para desarrollo, abrir la aplicación con `http://localhost:4294`; no usar `localhost.localdomain` para este flujo. El cliente de token de Google Identity Services no necesita una URI de redirección local ni el client secret.
4. Crear un archivo `.env` al lado de `compose.academicplanner.yml` con el client ID público, no con el client secret:

   ```dotenv
   GOOGLE_OAUTH_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ACADEMIC_TERM=2230
   ```

5. Reconstruir los servicios con `docker compose -f compose.academicplanner.yml up -d --build` desde la carpeta que contiene el compose.
6. Comprobar que `http://127.0.0.1:4294/api/calendar/config` responde con `available: true` y el client ID esperado. Después, abrir **Eventos → Conectar con Google**.

El frontend usa Google Identity Services con un token temporal conservado solo en memoria. No necesita ni debe recibir el client secret. Si aparece `origin_mismatch`, falta registrar exactamente el origen mostrado en la barra del navegador. En modo Testing, Google puede exigir reconexión periódica y solo permite las cuentas incluidas como usuarios de prueba.

Una cuenta de servicio y su archivo JSON no sustituyen este flujo: representan una identidad del servidor, no al estudiante que pulsa **Conectar Google Calendar**. AcademicPlanner no guarda claves privadas ni usa una cuenta común para mezclar calendarios personales. Si una clave privada se comparte accidentalmente, debe eliminarse en **IAM y administración → Cuentas de servicio → Claves** y sustituirse solo si existe otro proceso servidor-servidor que realmente la necesite.

## Lo que corresponde al backend de Caraballo

El backend no es un almacén de eventos. Ahora traduce el contrato hacia Google Calendar y publica los datos institucionales que el frontend necesita:

- períodos del año académico con `startsOn`, `endsOn`, zona horaria y URL de la fuente oficial;
- excepciones con fecha, rango opcional `endsOn`, tipo (`no_class` o `milestone`), título y detalle;
- cambios de horario o reposiciones confirmadas;
- un `updatedAt` y versión para que el frontend sepa cuándo refrescar el calendario.

La dependencia SQLite que existía en `develop` fue retirada en la rama `feat/academicplanner-calendar-50`. La explicación para Caraballo está en `docs/ENTREGA_50_ACADEMICPLANNER.md` del backend.

## Verificación realizada

- TypeScript y compilación de producción pasan.
- 219 pruebas automatizadas pasan, incluidas las de cuadrícula mensual, migración de preferencias, calendario anual, asuetos de varios días, límite del horario importado, finalización anticipada e idempotencia de eventos.
- 26 pruebas integrales de interfaz y 16 de integración HTTP pasan sobre el build de producción.
- El caso de una asignatura presencial un día y virtual otro está cubierto tanto en el parser del backend como en el recorrido HTTP del frontend.
- Pruebas de navegador móvil y escritorio: acceso, navegación, mapa 3D, feriado, fin de trimestre, preferencias, finalización anticipada y estado de Google; sin errores de consola, excepciones, peticiones fallidas ni desbordamiento horizontal.
- Informe reproducible del recorrido: `docs/UAT_50_2026-09-28.md`.

## Límite conocido

Google Calendar queda desactivado cuando `GOOGLE_OAUTH_CLIENT_ID` está vacío o cuando el origen actual no está autorizado en Google Cloud. El frontend no simula una sincronización que Google todavía no puede autorizar correctamente.

El paquete del mapa 3D continúa siendo el fragmento más grande del build. Está cargado de forma diferida y funciona correctamente, pero su reducción queda como optimización de rendimiento posterior, no como fallo funcional del 50 %.
