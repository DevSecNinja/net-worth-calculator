import { defineConfig, devices } from '@playwright/test';

const configuredUrl = process.env.DEPLOYMENT_BASE_URL;
if (!configuredUrl) {
  throw new Error('DEPLOYMENT_BASE_URL is required for deployed-site tests.');
}

const deploymentUrl = new URL(configuredUrl);
if (deploymentUrl.protocol !== 'https:' || deploymentUrl.pathname !== '/') {
  throw new Error('DEPLOYMENT_BASE_URL must be an HTTPS origin with a root path.');
}

export default defineConfig({
  testDir: './tests/deployment',
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 2,
  reporter: 'list',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: deploymentUrl.href,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 15'] } },
  ],
});
