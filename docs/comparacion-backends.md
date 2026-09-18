# Comparación de backends de AcademicPlanner

Fecha: 18 de septiembre de 2026. Revisión de código y pruebas locales con datos sintéticos; no se utilizaron credenciales ni se modificaron servicios desplegados.

## Versiones revisadas

- Compañero, main: `59bd3dd4bbb754736d26bea360ff234d840cb684`. Contiene solamente `/health` en su aplicación Python.
- Compañero, develop: `9e41e75f1d78874c204cf8577491cc1a0e01fc84`.
- Compañero, feature/LMORA: `2308c4cbcd94837d0220314ee192546c6f2dd4ab`. Esta rama contiene la implementación completa revisada y probada.
- Nuestro backend: `56c230013f499339ef51b0affb079f72cf0eb274`, en el repositorio intecschedule-frontend.

No se ha confirmado qué commit está desplegado detrás de la URL AWS original. Los fallos reproducidos explican mecanismos posibles del error observado, pero no identifican por sí solos la versión responsable en producción.

## Hallazgos confirmados

### 1. Un componente «A anunciar» invalida todo el horario — prioridad alta

`shared/normalization/schedule.py:16–19,53–61` transforma todos los registros en una única expresión. `meeting()` exige un intervalo y al menos un día. Un componente con «Días: A Anunciar Horas: A Anunciar» lanza `PortalStructureChangedError`, aunque los demás registros sean válidos. Esta combinación aparece en la captura de CONT 213 suministrada por el usuario. Una materia asincrónica sin horas tampoco puede representarse en el modelo actual.

Reproducción: dos encuentros válidos de la fixture del repositorio más un registro «A anunciar» causan la excepción. No es evidencia de contraseña incorrecta ni de indisponibilidad general del portal.

Nuestro backend conserva encuentros programados y devuelve componentes sin horario en `unscheduledSubjects`, diferenciando `asynchronous`, `to_be_announced` y `not_reported`. No considera asincrónica toda materia virtual o con horas vacías.

### 2. La última rama cambia la ruta pública — prioridad alta de integración

`routers/schedule.py:14–16` en feature/LMORA publica POST `/schedule/sync`; develop publica POST `/schedule`. Nuestro frontend llama `/api/schedule`, y el proxy elimina `/api`, dejando `/schedule`.

Reproducción local: POST `/schedule` devuelve 404 en feature/LMORA; POST `/schedule/sync` devuelve 401 sin token, confirmando que la ruta existe. Cambiar únicamente la URL base no basta para integrar esa rama. Este problema no explica por sí solo el antiguo error 502 de lectura del portal: son fallos diferentes.

### 3. La identificación de página puede aceptar solo navegación — prioridad alta

`shared/scraping/client.py`, función `is_schedule_page`, busca cadenas como `SSR_VW_CLASS_FL` en cualquier parte del HTML. Una página con un formulario que solo menciona esa ruta es aceptada como horario; inmediatamente después el parser la rechaza porque no contiene clases. La navegación retorna la primera página que cumple ese criterio y deja de explorar las restantes.

Reproducción sintética: un formulario cuyo action contiene ese marcador pasa la detección y falla al parsearse. No se verificó si esa era exactamente la respuesta del despliegue original.

### 4. Algunos encabezados válidos no se reconocen — prioridad media

`shared/normalization/schedule.py:13,43–50` rechaza `ICSG 202 ALGORITMOS MALICIOSOS` con espacios simples. La expresión requiere un separador especial o dos espacios entre código y nombre; la alternativa exige dígitos en el primer token. Las fixtures usan espacios dobles o guion, por lo que no detectan el problema.

Nuestro lector toma CLAVE y ASIGNATURA de columnas separadas y evita esa inferencia.

### 5. Puede perder encuentros silenciosamente — prioridad media

`meeting()` usa `TIME_RANGE.search`, que devuelve solo el primer intervalo. La prueba con `Martes 07:00-09:00; Jueves 12:00-14:00` devuelve únicamente el encuentro del martes. Además, `parse_manage_classes` combina listas con `zip(days, times)`, que trunca si sus tamaños difieren; no valida esa diferencia. No se ha demostrado que el portal real use la celda combinada del caso sintético.

Nuestro lector interpreta múltiples intervalos por columna de día y rechaza restos no reconocidos. Sus reglas son específicas del volante, no un parser universal de todas las vistas.

## Comparación de diseño

| Aspecto | Backend del compañero | Nuestro backend |
|---|---|---|
| Fuente | Vista «Ver Mi Horario/Clases», bloques PeopleSoft | Volante de selección, columnas semánticas |
| Autenticación | Valida login, cierra sesión y vuelve a iniciar sesión al consultar | Mantiene temporalmente la sesión BeeCampus autenticada hasta consumir la consulta |
| Contraseña | Se conserva en `active_sessions` en memoria | No se almacena en el registro de sesiones; se conserva el cliente autenticado |
| Limpieza | El diccionario de sesiones no tiene eliminación por caducidad ni límite de capacidad | TTL, límite de capacidad, limpieza periódica y consumo de sesión |
| Correo institucional | El modelo acepta texto pero no lo convierte a matrícula | Normalización en frontend y backend |
| Materias sin horas | Sin campo específico; fallo o pérdida según estructura | `unscheduledSubjects` con motivo explícito |
| Validación de identidad | La respuesta usa el ID solicitado; no lo contrasta con un ID leído del horario | Comprueba el ID de cada fila del volante |
| Profesor | La ruta específica de Gestión de Clases lo devuelve vacío | Lo toma de PROFESOR |
| Aula | Puede obtener una ubicación por encuentro | Usa AULA de la fila; puede ser menos detallada |
| Zona de fetchedAt | America/Santo_Domingo | UTC con zona explícita; ambos formatos son válidos |
| Despliegue | Infraestructura AWS CDK/Elastic Beanstalk/API Gateway | Contenedores, Nginx y API propia |

## Seguridad y operación

Estos puntos no son la causa demostrada del error de parser, pero requieren atención antes de producción:

- En `shared/constants.py`, `verify_tls` está desactivado. Nuestro cliente mantiene verificación TLS y añade la cadena intermedia necesaria.
- La firma JWT utiliza un valor provisional fijado en código. Debe cargarse desde configuración secreta y rotarse; no es suficiente que el cliente use HTTPS.
- `active_sessions` conserva contraseñas incluso después de expirar los tokens, porque no existe limpieza del diccionario. Esto no significa que se publiquen en las respuestas, pero amplía su permanencia en memoria.
- La infraestructura usa HTTP desde API Gateway hacia Elastic Beanstalk (`lib/integration/apigateway-stack.ts:12`). Si esa configuración se despliega sin otra capa protectora, el salto interno no tiene TLS.
- Ambos diseños mantienen sesiones en memoria del proceso. No se pueden escalar a múltiples workers o instancias sin resolver afinidad o almacenamiento compartido. Nuestro despliegue está configurado para un único worker.
- Nuestro backend también tiene límites: depende del formato del volante, no recupera automáticamente todas las páginas de un informe paginado, no resuelve todos los programas/periodos y el límite por IP requiere ajustar la confianza en el proxy antes de producción. No es una garantía de compatibilidad con toda cuenta o futuro cambio de BeeCampus.

## Pruebas ejecutadas en esta revisión

- Suite del compañero, feature/LMORA: **16/16 aprobadas**.
- Seis pruebas adicionales de caracterización: **6/6 confirmaron los comportamientos defectuosos descritos**. Están diseñadas para demostrar los fallos; que pasen no significa que el backend los maneje correctamente.
- Suite de nuestro backend: **51/51 aprobadas**, con dos avisos de deprecación de dependencias de pruebas.
- Sin pruebas nuevas con cuentas reales. No se cambió el código de ninguno de los backends ni se publicó un despliegue.

## Recomendación

Mantener por ahora nuestro backend como servicio del frontend actual. Para unificar el trabajo, conservar la infraestructura y la navegación útil del compañero, pero acordar una única ruta pública y reutilizar las reglas de clases sin horas, identidad, validación y sesiones de nuestra implementación. La navegación por Gestión de Clases puede aportar aulas por encuentro; debería introducirse como proveedor alternativo probado, no mezclando resultados sin validar que corresponden al mismo estudiante y periodo.

El primer arreglo del lector del compañero debe ser separar los componentes sin horas de los encuentros semanales. Después: validar bloques reales antes de declarar que una página contiene horario, corregir encabezados, detectar pérdida de encuentros y endurecer autenticación/transporte. Confirmar el commit desplegado y contrastar sus logs sanitizados permitirá atribuir el incidente original con precisión.

## Fuentes de código

- [Normalización del compañero](https://github.com/lmcaraballo/intecschedule-backend/blob/2308c4cbcd94837d0220314ee192546c6f2dd4ab/src/backend/shared/normalization/schedule.py)
- [Navegación del compañero](https://github.com/lmcaraballo/intecschedule-backend/blob/2308c4cbcd94837d0220314ee192546c6f2dd4ab/src/backend/shared/scraping/client.py)
- [Sesiones del compañero](https://github.com/lmcaraballo/intecschedule-backend/blob/2308c4cbcd94837d0220314ee192546c6f2dd4ab/src/backend/shared/authorizer.py)
- [Ruta del compañero](https://github.com/lmcaraballo/intecschedule-backend/blob/2308c4cbcd94837d0220314ee192546c6f2dd4ab/src/backend/routers/schedule.py)
- [Nuestro parser](https://github.com/lmcaraballo/intecschedule-frontend/blob/56c230013f499339ef51b0affb079f72cf0eb274/academicplanner-backend/app/parser.py)
- [Nuestro cliente del portal](https://github.com/lmcaraballo/intecschedule-frontend/blob/56c230013f499339ef51b0affb079f72cf0eb274/academicplanner-backend/app/portal.py)
