import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // comparten la misma data demo del backend — evitar carreras
  workers: 1,
  // La suite completa corrida en secuencia acumula carga (varios navegadores +
  // backend en --watch) y el login por demo-login puede tardar más de lo
  // habitual — un reintento absorbe esa varianza sin ocultar fallos reales
  // (cada flujo ya se verificó determinístico corriendo solo).
  retries: 1,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
