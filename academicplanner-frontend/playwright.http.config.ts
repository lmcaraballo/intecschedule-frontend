import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: '**/http.spec.ts', workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4281', serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4281 --strictPort',
    url: 'http://127.0.0.1:4281', reuseExistingServer: false,
    env: { VITE_ACADEMIC_API_MODE: 'http' },
  },
});
