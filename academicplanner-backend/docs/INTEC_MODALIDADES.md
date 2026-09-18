# Modalidades y casos de horario de INTEC

Investigación y revisión: 18 de septiembre de 2026. Aplicación: AcademicPlanner.

## Lo que confirma INTEC

El Reglamento Académico de 2025, artículo 47, distingue docencia presencial, semipresencial y virtual; la virtual puede ser sincrónica o asincrónica. Los artículos 48–50 separan preselección, selección y modificación; el 58 contempla retiros. Esto exige conservar la procedencia y actualizar el horario cuando cambian las inscripciones. La modalidad no se deduce del nombre o código de una materia, de sus créditos ni de la ausencia de horas. [Reglamento Académico 2025](https://www.intec.edu.do/component/zoo/?args%5B0%5D=0&element=5615f1dc-53bb-4aad-8bf1-38f39fcfb39d&format=raw&item_id=445&method=download&task=callelement).

El calendario agosto–octubre de 2026 indica inicio de docencia el 3 de agosto, feriado el 24 de septiembre, última semana de docencia del 12 al 17 de octubre y vacaciones intertrimestrales del 18 de octubre al 1 de noviembre. Una repetición semanal no basta para determinar si habrá clase en una fecha concreta. [Calendario trimestral oficial](https://www.intec.edu.do/estudiantes/calendarios/calendario-trimestral).

La guía de preselección indica que esta estima demanda y que en esa etapa puede no mostrarse el profesor. El carrito no debe convertirse en un horario de inscripciones confirmadas. [Guía BeeCampus](https://www.intec.edu.do/?catid=2&id=367%3Alanding-de-preseleccion&view=article).

Como evidencia complementaria, la oferta de formación del profesorado combina encuentros sincrónicos y actividades asincrónicas. No se extrapolan sus fechas ni su codificación a las asignaturas de grado. [Oferta profesoral febrero–abril 2026](https://profesorado.intec.edu.do/images/documentos/Portafolio-oferta-formativa-2026revLT.pdf).

## Reglas implementadas

- VIRTUAL con día y horas: conservar el encuentro. La interfaz indica que tiene horario programado; no lo transforma en trabajo autónomo.
- Días vacíos y aula VIRTUAL: conservar la materia como horario no informado. No afirmar que sea asíncrona ni que el horario necesariamente esté pendiente.
- Marcador explícito «Asíncrona», «Asincrónica» o sus variantes masculinas/«Virtual …»: conservar componente con `reason=asynchronous`, fuera de la cuadrícula y de próxima clase. Son formatos defensivos probados con datos ficticios, no una especificación oficial de BeeCampus.
- «A anunciar», «Por anunciar» y «Por confirmar» en una celda de día: conservar componente con `reason=to_be_announced`.
- Una fila puede contener horas válidas en un día y un marcador en otro: devolver ambos componentes. No duplicar ni inventar una reunión sin horas.
- Solo materias sin hora: mostrar actividades por revisar, sin afirmar que no existen materias inscritas o que no queda trabajo.
- DOM en el reporte: conservarlo y mostrar domingo en ambas vistas cuando haya una reunión ese día. Es una defensa ante datos válidos, no una afirmación de que todas las carreras tengan docencia dominical.
- No ofrecer orientación hacia edificios para una ubicación que explícitamente diga VIRTUAL.

## Matriz de casos y límites

| Caso | Tratamiento actual / trabajo pendiente |
| --- | --- |
| Virtual síncrona con hora | Se muestra en calendario y cálculos de clase actual/próxima. |
| Virtual sin hora, modalidad desconocida | Se conserva sin clasificar como asíncrona. |
| Asincronía explícita sin hora | Se conserva como componente; enlace al Aula Virtual, sin inventar entregas. |
| Presencial sin día u hora | Horario no informado o por anunciar según evidencia. |
| Materia con encuentros y componente sin hora | Ambos se conservan; probado con marcadores en celdas distintas. |
| Solo materias asíncronas | Acceso válido y mensajes que recuerdan las actividades. |
| Teoría y laboratorio con códigos distintos | Se conservan por separado; no se fusiona el sufijo L. |
| Varias reuniones el mismo día | Intervalos separados por salto, coma, punto y coma o barra admitidos. |
| Profesor o aula vacíos | Datos por confirmar, sin rechazar horas válidas. |
| Clases consecutivas o superpuestas | Final exclusivo y orden estable; la semana usa listas si hay superposición. No prueba que la inscripción autorice el choque. |
| Domingo y horarios nocturnos | Domingo visible cuando existe; horas válidas 00:00–23:59 dentro del mismo día. |
| Aula diferente según reunión / modalidad híbrida | Se conserva lo que devuelve el reporte. Su única columna AULA no permite reconstruir un aula distinta por día; falta enriquecer desde Mis Clases. |
| Feriados, reposiciones, exámenes extraordinarios | No integrados al cálculo de Ahora. Se advierte que la vista es recurrente; falta un calendario de excepciones con fuente y vigencia. |
| Inicio/fin de cada sección, semanas alternas | El reporte actual no aporta esas fechas al modelo; falta leerlas de Mis Clases. No se puede garantizar la próxima clase fuera del período. |
| Cambio de trimestre | ACADEMIC_TERM sigue configurado en el servidor; falta selección/detección fiable y mostrar período en la interfaz. No reutilizar 2230 indefinidamente. |
| Viaje o dispositivo en otra zona horaria | Aún se calcula con la zona del dispositivo. Pendiente fijar America/Santo_Domingo en cálculos y navegación; advertencia visible. |
| Retiro, cambio de sección o aula | Requiere volver a consultar; los datos guardados son una instantánea, no sincronización continua. |
| Paginación / datos parciales | Se rechazan; pendiente navegar Ver Todo y probar cuentas con más filas. |
| Fila duplicada | Se rechaza tanto en reuniones como en componentes sin hora, evitando duplicación silenciosa. |
| «07:00–09:00 A anunciar» dentro de una sola celda | Sigue rechazándose por ambiguo; hace falta evidencia del formato para dividirlo con seguridad. |
| Hora final menor que inicial / medianoche | Se rechaza; no se presupone una sesión que cruza de día. |
| Reporte vacío, varios programas o ciclo sin matrícula | No se declara éxito vacío sin evidencia. Faltan muestras autorizadas para esos flujos. |
| Etiqueta de modalidad ausente o truncada | No completar ni inferir a partir de una abreviatura o del nombre de la materia. |

## Validación

51 pruebas de backend, 201 de frontend, comprobación de tipos y build; 16 pruebas HTTP en navegador. Las nuevas cubren asincronía explícita, modalidad desconocida, horario por anunciar, componentes mixtos, solo trabajo sin hora, domingo, recarga y móvil.

Las pruebas reales anteriores validaron tres cuentas, incluida una con una materia sin horas. No demostraron una etiqueta explícita de asincronía ni todos los formatos posibles del portal. Los nuevos marcadores se verifican con fixtures sintéticos. No se almacenan aquí identidades, contraseñas ni horarios personales.

Antes de un despliegue público que prometa «tu próxima clase real», priorizar período/vigencia, excepciones académicas y zona horaria. La presente revisión resuelve representación de virtualidad y componentes sin horario; no declara completadas esas integraciones.
