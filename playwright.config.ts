import { defineConfig, devices } from '@playwright/test';

// e2e sur le build de prod (vite preview), viewport iPhone, Chromium seul (rapide, gratuit).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['iPhone 15'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4173/',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
