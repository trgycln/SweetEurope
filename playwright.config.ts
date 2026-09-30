import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from default ".env.test" file.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const isSmokeTest = process.argv.join(' ').includes('smoke-production.spec.ts') || process.env.SMOKE_TEST === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: isSmokeTest ? undefined : require.resolve('./tests/e2e/setup.ts'),
  globalTeardown: isSmokeTest ? undefined : require.resolve('./tests/e2e/teardown.ts'),
  fullyParallel: false,
  workers: 1,
  timeout: 300000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isSmokeTest ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
});
