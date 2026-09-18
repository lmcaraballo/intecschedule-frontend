# AcademicPlanner — revisión QA del primer incremento

Fecha: 18 de septiembre de 2026. Origen: copia local de `academicplanner-frontend`; archivos originales preservados. El repositorio remoto contiene infraestructura AWS CDK y no este frontend.

## Estado inicial, antes de corregir

- `npm test`: 127/127 pruebas, 8 archivos, pasan.
- `npm run build`: pasa; dos advertencias de anotaciones de Zod, sin errores.
- No existe script lint. TypeScript tiene comprobación de imports y parámetros sin usar.
- Navegador: acceso, Ahora, Día, Semana, Más y Eventos en 320/375/390/430/768/1024/1280/1440 px sin overflow general con los datos de demostración. Sin errores de consola.
- Axe no detecta infracciones estables en acceso y horario día/noche. Un resultado durante la transición de tema se descartó tras repetir esperando el render final.
- Siete pruebas nuevas fallaron antes de corregir: contraseña solo espacios, identificadores/asignatura/código solo espacios y sección vacía. La reproducción adicional de clases solapadas también falló: ocho casos fallidos antes de corregir.

## Defectos reproducibles

### QA-001 — Contraseña vacía visualmente permite continuar
- Severidad: Medium. Área: Acceso.
- Precondición: modo demo, sin horario.
- Pasos: introducir matrícula; contraseña de tres espacios; Continuar.
- Obtenido: navega a Ahora y guarda un horario.
- Esperado: validar el campo; conservar espacios significativos en una contraseña no vacía.
- Estado: Fixed.

### QA-002 — Código largo desborda el detalle
- Severidad: Medium. Área: Responsive.
- Precondición: horario válido con `subjectCode` de 250 caracteres, viewport 390 px.
- Pasos: abrir Horario y el detalle de esa clase.
- Obtenido: diálogo de 388 px con scrollWidth de 2004 px; texto cortado horizontalmente.
- Esperado: texto envuelto y detalle legible dentro del viewport.
- Estado: Fixed.

### QA-003 — Respuestas con campos esenciales en blanco reemplazan el horario válido
- Severidad: High. Área: Storage / contrato.
- Precondición: horario previo válido.
- Pasos: simular nueva respuesta con `id`, `subjectCode` o `subjectName` igual a espacios; consultar.
- Obtenido: la respuesta pasa Zod y se guarda.
- Esperado: INVALID_RESPONSE controlado y horario previo intacto.
- Estado: Fixed.

### QA-004 — Una sección vacía descarta todo el horario
- Severidad: Medium. Área: contrato / detalle.
- Precondición: respuesta correcta con sección vacía y datos descriptivos opcionales en blanco.
- Pasos: validar respuesta y abrir detalle.
- Obtenido: se rechaza el horario; campos opcionales con espacios tampoco tienen fallback útil.
- Esperado: aceptar sección no disponible, normalizar descripciones y mostrar «Por confirmar».
- Estado: Fixed.

### QA-005 — La PWA captura navegaciones de la API
- Severidad: Medium. Área: PWA / integración.
- Precondición: service worker instalado.
- Pasos: navegar directamente a `/api/academic/schedule`.
- Obtenido: el service worker devuelve index.html de AcademicPlanner.
- Esperado: `/api` y sus rutas deben resolverse en el servidor y nunca caer en el fallback de la SPA. Los POST no se cacheaban; el defecto afecta navegaciones GET.
- Estado: Fixed.

### QA-006 — Segunda clase simultánea figura como pendiente
- Severidad: Medium. Área: Ahora.
- Precondición: lunes 09:22; clases 08:00–10:00 y 09:00–11:00.
- Pasos: abrir Ahora; revisar agenda del día.
- Obtenido: solo la primera aparece «En curso», la segunda «Pendiente».
- Esperado: ambas filas en curso; mantener selección estable de la tarjeta principal, sin implementar un módulo de conflictos.
- Estado: Fixed.

### QA-007 — Documentación enlaza una revisión inexistente
- Severidad: Low. Área: documentación.
- Precondición: copia local original.
- Pasos: seguir `docs/FINAL_REVIEW.md` desde README o handoff.
- Obtenido: archivo inexistente.
- Esperado: informe verificable y enlaces válidos.
- Estado: Fixed.

## Resumen

Total encontrados: **7**. Critical: **0**. High: **1**. Medium: **5**. Low: **1**.
Corregidos y vueltos a probar: **7**. Defectos pendientes de esta revisión: **0**.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | **169/169**, 11 archivos; antes había 127. |
| `npm run typecheck` | Pasa. |
| `npm run build` | Pasa en modo mock y HTTP. Dos warnings de anotaciones de Zod, no ocultados. |
| `npm run lint` | No existe; no ejecutado. No se atribuye a TypeScript una auditoría de estilo. |
| `npm run test:e2e` | **18/18** Chromium. |
| `npm run test:e2e:http` | **8/8** Chromium, respuestas HTTP controladas. |
| Docker + Nginx + backend de prueba | Build, rutas profundas, assets inexistentes, caché, POST real por proxy, error 401 con fallback y API excluida del service worker: pasan. |
| Proxy local Vite | POST real hacia el servidor de prueba: pasa. |
| `npm audit` | **0 vulnerabilidades reportadas**, dependencias de producción y desarrollo, al ejecutar la revisión. |

Se añadieron **42 casos unitarios/integración** y **26 casos de navegador**. Los ejemplos OpenAPI se validan contra los esquemas reales. Los logs originales de ejecución se adjuntan con la entrega.

Cobertura de acceso: vacío, espacios, Unicode/emoji, longitud máxima y excesiva (esquema), Enter y doble envío, contraseña retirada del campo, progreso, cancelación al navegar, errores y reintento. En HTTP se probaron los seis códigos, contenido inesperado, mismatch de estudiante, timeout, cancelación y fallos de red.

Cobertura de datos: vacío, JSON corrupto, versión no soportada, campos parciales, clases null/texto, tipos inválidos, IDs duplicados, campos esenciales en blanco, fecha/hora inválida, horas invertidas, storage inaccesible/cuota agotada, cambios entre pestañas y conservación del último horario.

Cobertura temporal: 07:59, 08:00, 08:01, 09:59, 10:00 y 10:01 para una clase 08:00–10:00; antes/durante/entre/después; clases consecutivas, simultáneas, desordenadas, única clase, horario vacío, sábado/domingo, medianoche y cambio de año.

Responsive: rutas principales con códigos de 250 caracteres y nombres extensos en **320, 375, 390, 430, 768, 1024, 1280 y 1440 px**. Diálogo con contenido envuelto; 20 clases superpuestas conservan sus detalles. Los datos normales también se verificaron antes de los cambios.

Accesibilidad: axe sin infracciones detectadas en acceso, Ahora, Día, Semana, Más, Eventos y detalle en día/noche; labels, foco visible, Enter, Tab/Shift+Tab, Escape, retorno de foco y movimiento reducido. No se detectó un defecto estable de contraste: la primera lectura ocurría durante la transición de tema y se descartó al repetir. No equivale a certificación WCAG.

Offline: después del precaché, cerrar pestaña, desconectar el contexto, abrir Ahora en nueva pestaña, navegar a Semana y Detalle y reconectar. Pasa, incluido «Sin conexión». Una primera lectura incorrecta se debió a usar un Chromium anterior al requerido por Playwright; se repitió con el navegador compatible antes de evaluar la aplicación. No se modificó el código de conexión por ese falso resultado.

Seguridad observada: contraseña ficticia ausente de localStorage, sessionStorage y URL; sin logs de credenciales en el frontend; campos extras eliminados; respuestas y cookies de API fuera de caché. No hubo errores de ejecución en los recorridos demo; los fallos HTTP provocados formaron parte de las pruebas controladas.

Reverificación por defecto: QA-001 (`authSchema` y acceso navegador); QA-002 (ocho anchos y detalle); QA-003 (`responseValidation`, transacción y storage); QA-004 (respuesta normalizada y detalle); QA-005 (navegación API sin service worker, con 405 JSON en Nginx); QA-006 (dos filas simultáneas en curso); QA-007 (documento final existente y enlaces locales comprobados).

## Resultado final

El frontend está funcional y verificado para el alcance del primer incremento **con consulta institucional simulada**. El adaptador HTTP y el despliegue con proxy están probados con un servidor de prueba. No se ha autenticado contra el portal ni publicado en cloud. Los cambios son incrementales; no se añadieron eventos, Campus, Google Calendar, registro ni base de datos.

## Riesgos conocidos

- Backend institucional aún no recibido: quedan autenticación, parser, latencia y validación con datos reales.
- Horario semanal recurrente y hora del dispositivo; sin vigencia, feriados ni zona de campus automática. Ahora admite domingo; Horario mantiene el alcance lunes–sábado.
- Offline exige una carga previa y un horario guardado. Borrar storage/caché del navegador elimina esas capacidades.
- Navegador validado: Chromium. Safari, Firefox, instalación en dispositivos físicos y lector de pantalla requieren una pasada posterior.
- Las imágenes base Docker y dependencias deben pasar las políticas de actualización del equipo antes de operar en producción. `npm audit` solo cubre avisos conocidos de npm.
- La cuenta `meliodr` carece de permiso push en el remoto. El commit y paquete se entregan localmente; no se declara publicación exitosa.

## Recomendaciones para siguiente incremento

Conectar el endpoint del contrato, acordar `isPino`, vacío frente a error y horarios dominicales; probar conjuntamente el servicio real; validar el dominio HTTPS de destino y dispositivos reales. Mantener las suites en CI. No ampliar funcionalidades antes de cerrar esa integración.

## Valoración por pantalla

Escala orientativa 1–10 basada en funcionalidad (40%), fidelidad al contrato/datos de prueba (25%), accesibilidad revisada (20%) y presentación (15%): acceso **9**, Ahora **9**, Horario **9**, Detalle **9**, Más **9**. Salud observada del alcance: **9/10**. Estas notas describen esta revisión, no una métrica de usuarios ni disponibilidad del backend; el margen restante corresponde a verificación con servicio y dispositivos reales.
