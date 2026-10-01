# AcademicPlanner

PWA de organización académica para estudiantes. **Estado: alcance funcional 100% implementado**, con acceso institucional, Ahora dinámico, Horario Día/Semana/Mes, mapa 3D del campus, modalidad por encuentro, calendario académico acotado al trimestre, eventos personales, sincronización bidireccional con Google Calendar, preferencias y último horario válido local.

React, TypeScript estricto, Vite, React Router, Zod, CSS con tokens, vite-plugin-pwa, Vitest y Testing Library. Requiere Node.js 22.12 o superior.

```sh
cd academicplanner-frontend
npm ci
npm run dev
```

Abre la URL indicada por Vite. Para la demostración usa matrícula y contraseña ficticias; bajo el formulario puedes elegir entre seis resultados de consulta.

```sh
npm test
npm run build
npm run preview
```

`npm run test:watch` activa el modo interactivo y `npm run typecheck` verifica TypeScript. No hay script de lint. Para comprobar la PWA, usa build/preview y cárgala una vez antes de desconectar.

El mock es el modo predeterminado para pruebas reproducibles. El modo HTTP consume el backend de Caraballo para autenticación, horario, calendario institucional y el puente sin base de datos hacia Google Calendar. `.env.example` documenta el selector público `VITE_ACADEMIC_API_MODE`; nunca debe contener credenciales.

Se conserva únicamente perfil básico, horario, fecha de actualización, preferencias y marcas locales de una clase terminada antes bajo `academicplanner:data:v1`. Más permite limpiar esos datos. No se guardan contraseñas, sesiones del portal ni tokens de Google.

- [Verificación final vigente del desarrollo](docs/FINAL_REVIEW.md)
- [Handoff frontend/backend del primer incremento](docs/FRONTEND_25_HANDOFF.md)
- [Alcance histórico del primer incremento](docs/INCREMENTO_25.md)
- [Calendario académico, preferencias y contrato de Google](docs/FRONTEND_50_CALENDARIO_Y_PREFERENCIAS.md)
- [Mapa 3D del campus y contrato de ubicación](docs/FRONTEND_50_CAMPUS.md)

Dependencias externas para la validación final: mantener el correo del probador en la pantalla de consentimiento OAuth mientras la aplicación siga en modo de prueba, actualizar el calendario al próximo año académico cuando INTEC lo publique y ejecutar la prueba de aceptación con las cuentas institucionales autorizadas. No hay base de datos propia en el alcance. Servir `dist/` por HTTPS con fallback SPA y reservar `/api/*` para la integración institucional.

## Integración y despliegue

- [Guía de despliegue, proxy local y Docker](docs/DEPLOYMENT.md).
- [Contrato OpenAPI para backend](docs/openapi.json).
- [Auditoría QA](docs/QA_25_REPORT.md) y [correcciones](docs/QA_25_FIXES.md).

`VITE_ACADEMIC_API_MODE=http` activa el adaptador existente; `API_PROXY_TARGET` conecta el servidor de desarrollo. En producción, Docker recibe `API_UPSTREAM` y sirve SPA + proxy bajo el mismo origen. El adaptador corresponde al backend compartido: login con token temporal, consulta de horario, calendario institucional y operaciones de Google Calendar. También se admite el correo institucional de estudiante. Ver [diagnóstico vigente](docs/ACCOUNT_DIAGNOSTIC.md) y [integración y pruebas](docs/BACKEND_INTEGRATION.md).

Pruebas de navegador reproducibles (ejecutar secuencialmente):

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:http
```

La primera suite construye la demo; la segunda construye en modo HTTP con respuestas controladas. Para volver a mostrar la demo local después, ejecutar `npm run build` con el modo `mock`. No hay script lint.

- [Matriz histórica de riesgos del 25 %](docs/QA_25_RISKS.md).
