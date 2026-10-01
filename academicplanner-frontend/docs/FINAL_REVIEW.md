# AcademicPlanner — revisión final de desarrollo

**Estado al 1 de octubre de 2026: alcance funcional de desarrollo 100 % implementado.**

Esta conclusión se refiere al código del frontend y del backend, sus contratos,
pruebas reproducibles y ejecución local integrada. No afirma que el despliegue en
producción, la aprobación de OAuth ni la aceptación académica estén terminados.

## Alcance implementado

- Acceso institucional temporal, importación y conservación del último horario válido.
- Vistas Ahora, Día, Semana y Mes, incluidas materias sin hora y encuentros dominicales.
- Modalidad y ubicación por encuentro; detalle de clase y mapa 3D con enfoque y reinicio.
- Año académico agosto 2026–julio 2027 con cuatro trimestres, feriados, asuetos y actividades estudiantiles; cada horario importado permanece limitado a su propio trimestre.
- Eventos personales y sincronización bidireccional e idempotente con un calendario de Google dedicado.
- Recordatorios de clases e hitos institucionales, preferencias, accesibilidad y modo sin conexión.
- Acción para terminar una clase antes de tiempo y conservar esa decisión localmente.
- Errores de dominio, límites, caché segura, encabezados de seguridad y TLS verificado hacia BeeCampus.

## Verificación reproducible

- Frontend: **219/219** pruebas unitarias y de integración.
- Navegador en modo demostración: **27/27** recorridos.
- Navegador en modo HTTP: **16/16** recorridos.
- Backend local integrado: **54/54** pruebas.
- Backend AWS: **45/45** pruebas Python y **1/1** prueba de infraestructura.
- Builds de Vite y TypeScript/CDK correctos; Ruff y comprobación de formato correctos.
- Auditoría de dependencias de producción del frontend: **0 vulnerabilidades conocidas**.
- Ejecución Docker comprobada a través del mismo origen para salud, calendario institucional y errores de Google Calendar.
- Recorrido manual: Ahora, Horario, detalle, mapa 3D, Eventos y Preferencias sin errores de consola.

El build de Vite conserva dos avisos no bloqueantes: anotaciones de Zod y un
chunk principal mayor de 500 kB. No afectan la compilación ni las pruebas, pero
son una oportunidad de optimización posterior.

## Evidencia y límites de publicación

El calendario institucional fue contrastado con la publicación oficial vigente
de INTEC y conserva su URL de origen. La integración de Google usa solo el client
ID público, permisos mínimos de calendario y tokens mantenidos en memoria; nunca
requiere un client secret en el navegador.

Para una publicación real todavía se necesita configurar el client ID OAuth del
entorno, mantener las cuentas de prueba autorizadas mientras Google esté en modo
de prueba, desplegar ambos servicios por HTTPS y ejecutar aceptación con cuentas
institucionales autorizadas. El siguiente trimestre debe añadirse cuando INTEC lo
publique el siguiente año académico; no se extrapola.

Azure conserva las Features F01–F06 en `In Progress`, F07–F08 y HU36–HU45 en
`New`. Es intencional: los estados no se cerraron sin la evidencia de aceptación
y despliegue correspondiente, y no se eliminó ningún elemento histórico.

## Ramas revisadas

- Frontend e integración local: `feat/academicplanner-100`.
- Backend e infraestructura AWS: `feat/academicplanner-calendar-50`.

Los documentos de 25 % y 50 % permanecen como historial de incrementos; este
archivo es el estado vigente del desarrollo.
