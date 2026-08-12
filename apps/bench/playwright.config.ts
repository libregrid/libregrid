import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: process.env['BENCH_BASE_URL'] ?? 'http://localhost:4202',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'NX_DAEMON=false npx nx serve docs --port=4202',
    url: 'http://localhost:4202',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
