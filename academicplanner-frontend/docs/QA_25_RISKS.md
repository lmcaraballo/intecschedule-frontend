# AcademicPlanner — matriz de riesgos del 25%

> Actualización posterior: el backend de desarrollo ya fue proporcionado y el adaptador fue actualizado. Consultar [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) para el estado vigente (186 pruebas de lógica y 37 de navegador); los resultados siguientes corresponden a la auditoría previa.

Segunda auditoría local, 18 de septiembre de 2026. «Mitigado» no significa imposible: indica que hay controles y evidencia. Prioridad P1 alta, P2 media, P3 baja. No se amplía el alcance del producto.

| ID | Riesgo | Probabilidad | Impacto | Prioridad | Mitigación | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Portal/servicio no disponible o lento | Alta | Alto | P1 | Timeout de 20 s en HTTP, error humano, reintento manual, último horario intacto. | Mitigado en frontend; integración real pendiente. |
| R-02 | Exposición de contraseña | Baja con controles | Crítico | P1 | Vaciar campo, no persistir ni registrar; solo POST; proyectar respuesta con Zod; variables VITE públicas sin secretos. | Mitigado y probado con valores ficticios; backend debe aplicar igual política. |
| R-03 | Respuesta inválida o semánticamente imposible | Media | Alto | P1 | Zod valida estructura, horas, orden inicio/fin, IDs únicos y matrícula; validar antes de guardar. | Mitigado con matriz de respuestas y HTTP. |
| R-04 | Horario local corrupto o modificado manualmente | Media | Alto | P1 | Storage centralizado, esquema/versionado, error controlado; relectura en eventos de storage, foco y visibilidad. | Mitigado; modificación en la misma pestaña se detecta al recuperar foco/visibilidad, no por sondeo continuo. |
| R-05 | Lógica temporal incorrecta en límites | Media | Alto | P1 | Inicio inclusivo, fin exclusivo, cálculo derivado; pruebas de minutos, medianoche, sábado/domingo y superposición. | Mitigado para recurrencia semanal y hora del dispositivo. |
| R-06 | Pérdida del último horario válido | Media | Crítico | P1 | Validación previa, escritura atómica de un registro, no borrar ante error, manejo de cuota y cancelación. | Mitigado. La eliminación explícita del usuario y el borrado de datos del navegador son irreversibles localmente. |
| R-07 | Fallo offline | Media | Alto | P1 | Precaché estático, datos locales, rutas profundas, reapertura offline y reconexión probadas. | Mitigado tras precaché; primer uso offline o caché eliminada no se cubren. |
| R-08 | Incompatibilidad responsive, texto ampliado o zoom | Media | Medio | P2 | Ocho anchos, reflow, controles flexibles, texto 200 % y zoom real 200 %. | Mitigado en Chromium; dispositivos físicos y otros motores pendientes. |
| R-09 | Regresión por una corrección | Media | Alto | P1 | Pruebas rojas antes del arreglo, regresión unitaria/demo/HTTP, TypeScript y build. CI existente preparado. | Mitigado localmente; CI remoto no se ejecutó en esta ronda. |
| R-10 | Respuestas antiguas llegan después de las nuevas | Media | Alto | P1 | Última consulta iniciada en cada instancia; comparar instantes fetchedAt del mismo perfil antes de guardar; prueba real con dos pestañas. | Mitigado con timestamps fiables. Backend debe fechar la consulta correctamente; empates entre pestañas o relojes incorrectos no equivalen a versionado global. |
| R-11 | Excepción inesperada de renderizado | Baja | Alto | P1 | Error del router y boundary exterior; fallback genérico y datos preservados; prueba de inyección en proveedor. | Mitigado para errores de render. No cubre fallos de descarga inicial ni todas las excepciones asíncronas ajenas a React. |
| R-12 | Service worker obsoleto tras actualizar | Baja | Alto | P2 | AutoUpdate, limpieza de precaché antiguo, assets con hash, no-cache para HTML/SW en plantilla de servidor; API excluida. | Mitigado por configuración; evolución entre versiones en dispositivos reales requiere comprobación de publicación. |
| R-13 | Contrato institucional difiere del mock | Alta hasta integrar | Alto | P1 | Contrato OpenAPI y ejemplos validados, adaptador HTTP aislado, respuestas de error definidas. | Aceptado para este 25 % simulado; requiere prueba conjunta cuando llegue backend. |
| R-14 | Horas del dispositivo distintas del campus o semestre terminado | Media | Medio | P2 | Explicación visible y documentación de recurrencia local. | Limitación aceptada del incremento; vigencia/feriados/zona de campus necesitan un acuerdo futuro. |

No se detectaron vulnerabilidades npm conocidas en la revisión final; esto no certifica seguridad del portal, infraestructura o futuras dependencias. No hay riesgos derivados de registro, GPS, Google Calendar o una base de datos propia porque están fuera del alcance.
