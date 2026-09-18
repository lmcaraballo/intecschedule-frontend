import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  testIgnore: '**/http.spec.ts',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4280', timezoneId: 'America/Santo_Domingo', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4280 --strictPort',
    url: 'http://127.0.0.1:4280', reuseExistingServer: false,
    env: { VITE_ACADEMIC_API_MODE: 'mock' },
  },
});
