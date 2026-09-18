# AcademicPlanner

PWA de organización académica para estudiantes. **Estado: frontend 25%**, con acceso institucional simulado, Ahora dinámico, Horario Día/Semana, detalle de solo lectura, último horario válido y navegación offline con datos locales.

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

El mock es el modo predeterminado. El adaptador HTTP está preparado, pero aún no se ha conectado a un backend institucional. `.env.example` documenta el selector público `VITE_ACADEMIC_API_MODE`; nunca debe contener credenciales.

Se conserva únicamente perfil básico, horario, fecha de actualización y tema bajo `academicplanner:data:v1`. Más permite limpiar esos datos. No se guardan contraseñas ni sesiones del portal.

- [Handoff frontend/backend: modelos, contrato, seguridad e integración](docs/FRONTEND_25_HANDOFF.md)
- [Verificación final y estado de entrega](docs/FINAL_REVIEW.md)
- [Alcance del incremento](docs/INCREMENTO_25.md)

Pendientes: conexión institucional real, eventos personales, conflictos, Google Calendar, Campus, experiencia Pino completa y vista Mes. No hay backend ni base de datos incluidos. Servir `dist/` por HTTPS con fallback SPA y reservar `/api/*` para el backend futuro.

## Integración y despliegue

- [Guía de despliegue, proxy local y Docker](docs/DEPLOYMENT.md).
- [Contrato OpenAPI para backend](docs/openapi.json).
- [Auditoría QA](docs/QA_25_REPORT.md) y [correcciones](docs/QA_25_FIXES.md).

`VITE_ACADEMIC_API_MODE=http` activa el adaptador existente; `API_PROXY_TARGET` conecta el servidor de desarrollo. En producción, Docker recibe `API_UPSTREAM` y sirve SPA + proxy bajo el mismo origen. El backend institucional aún está pendiente.

Pruebas de navegador reproducibles (ejecutar secuencialmente):

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:http
```

La primera suite construye la demo; la segunda construye en modo HTTP con respuestas controladas. Para volver a mostrar la demo local después, ejecutar `npm run build` con el modo `mock`. No hay script lint.
