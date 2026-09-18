# Primer incremento entregable de AcademicPlanner

Este incremento completa la base y el núcleo académico del frontend existente. El alcance del «25%» describe esta entrega funcional; no es una medición del trabajo total del producto. El portal institucional sigue simulado.

## Funcional

- Acceso con validación, credenciales temporales, tres etapas de carga, respuesta validada y navegación a Ahora tras guardar.
- Ahora calcula clase actual, progreso, próxima clase, tiempo libre y estado del día con el reloj local. No persiste datos derivados.
- Horario ofrece Día y Semana, lunes a sábado, navegación por fechas y colores estables por asignatura.
- Detalle institucional de solo lectura, accesible con teclado, en panel lateral o inferior según el ancho.
- Temas día/noche y selección automática contextual; morning y sunset se reconocen y usan la presentación de día.
- Recuperación con último horario válido, fecha de consulta visible y navegación académica sin conexión con datos descargados.
- Más permite borrar el perfil, horario y preferencias, con confirmación, sin afectar otras aplicaciones. Las pestañas abiertas se actualizan y las consultas pendientes se cancelan.
- Estados de carga, error, vacío, desconexión, almacenamiento corrupto/inaccesible y cuota agotada.

## Contrato de estados

| Situación | Comportamiento |
| --- | --- |
| Consulta exitosa | Valida el perfil y el horario, guarda y abre Ahora. |
| Credenciales incorrectas | Solicita revisar identificación o contraseña. |
| Portal no disponible | Explica la indisponibilidad temporal y permite reintentar. |
| Horario no encontrado | Informa que no se encontró el horario; no reemplaza el anterior. |
| Respuesta incompleta | Muestra un error humano; no guarda datos incompletos. |
| Horario vacío confirmado | Guarda la respuesta válida y presenta un estado vacío útil. |
| Fallo con horario previo | Conserva el registro y permite continuar con él, mostrando la actualización. |
| Fallo en primer uso | Explica que se necesita reintentar para obtener el primer horario. |
| Sin conexión con horario | Ahora, Horario y Detalle funcionan; consultar requiere reconexión. |
| Sin conexión sin horario | Explica que se necesita conexión para la primera consulta. |

## Simulación

`academicApi` devuelve datos ficticios: ocho clases de lunes a sábado y un perfil básico. El selector de demostración permite probar los seis resultados del servicio sin utilizar credenciales reales. No autentica contra una institución ni envía la contraseña a un servidor. El flujo exige conexión indicada por el navegador para representar la consulta futura.

## Datos y seguridad

Única clave de localStorage: **`academicplanner:data:v1`**.

Contiene versión del formato, perfil `{ id, isPino }`, clases del último horario válido, fecha `fetchedAt` y preferencia de tema. Puede contener únicamente preferencias con `session: null`. Zod valida y elimina campos adicionales antes de serializar.

No se guardan contraseñas, tokens, sesiones del portal ni resultados derivados de Ahora. La contraseña sale del formulario al enviar y solo permanece en memoria durante la petición. El precaché PWA contiene archivos estáticos, incluidas fuentes; no contiene respuestas institucionales. La guardia de rutas depende de datos locales y no sustituye autenticación del servidor.

## Estructura

```text
src/
  app/                   rutas y proveedores de datos
  components/            controles, estados, tarjetas y diálogos
  features/
    auth/                acceso y validación
    now/                 pantalla Ahora
    schedule/            vistas, detalle y dominio temporal
    preferences/         preferencias y limpieza local
  services/              API mock y transacción de consulta
  storage/               persistencia validada y suscripciones
  theme/                 tokens y temas
  types/                 modelos y esquemas Zod
  utils/                 reloj, fechas y conexión
  mocks/                 datos académicos ficticios
  test/                  configuración de pruebas
```

## Ejecutar y verificar

Con Node.js 22.12 o superior, desde `academicplanner-frontend`:

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

El build incluye TypeScript estricto. Las pruebas cubren almacenamiento y limpieza, servicio, recuperación, límites temporales, temas, colores y el flujo completo acceso → horario recibido → guardado → Ahora. Para probar la PWA, usar build/preview y cargarla una vez antes de desconectar; requiere HTTPS o localhost. La configuración actual no incluye ESLint.

Verificación de esta entrega: **106 pruebas aprobadas en 7 archivos** y **build de producción correcto**. En Chrome se comprobó acceso, recuperación tras fallo, recarga servida por el service worker, vistas sin conexión, reconexión, diálogos con teclado, movimiento reducido, limpieza/cancelación y horario vacío. Se revisaron anchos de 320, 390, 768, 1100 y 1440 px sin desbordamiento horizontal; no se detectaron errores de consola durante el recorrido. La emulación de Chrome reinicia su indicador de conexión al recargar mediante el service worker: el recorrido reaplica el modo offline tras esa navegación; queda pendiente validar desconexión física en dispositivos reales.

## Pendiente y deuda técnica

- Integración real con el backend y portal, contrato de errores y autenticación del servidor. Los mocks no demuestran disponibilidad ni seguridad de esa integración.
- Vigencia del período, feriados y cancelaciones: el horario actual es recurrente semanal.
- Presentaciones específicas de morning/sunset; actualmente usan day.
- CI, lint y automatización permanente de las comprobaciones en navegador. Verificación adicional en Safari, Firefox, dispositivos físicos e instalación PWA.
- `navigator.onLine` indica conexión del dispositivo, no disponibilidad efectiva del portal. Los errores de consulta se gestionan independientemente.
- Eventos personales, vista Mes, Google Calendar, Campus completo, GPS, base de datos, registro, recuperación de contraseña, calificaciones y estadísticas permanecen fuera del alcance.

El build puede emitir advertencias no bloqueantes de anotaciones `@__PURE__` de Zod; no afectan la compilación ni requieren modificar dependencias instaladas.
