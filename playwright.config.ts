import { defineConfig, devices } from '@playwright/test';

const previewPort = Number(process.env.PLAYWRIGHT_PORT ?? 43173);
const baseURL = `http://127.0.0.1:${previewPort}/net-worth-calculator/`;
const broadProjectIgnores = ['**/deployment/**', '**/performance/**', '**/device/**'];
const iphone14ProMax = {
  ...devices['iPhone 14 Pro Max'],
  viewport: { width: 430, height: 932 },
  screen: { width: 430, height: 932 },
  trace: 'off' as const,
};
const ipadPro12 = {
  userAgent:
    'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 1024, height: 1366 },
  screen: { width: 1024, height: 1366 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit' as const,
  trace: 'off' as const,
};
const desktop4k = {
  ...devices['Desktop Chrome'],
  viewport: { width: 3840, height: 2160 },
  screen: { width: 3840, height: 2160 },
  trace: 'off' as const,
};

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/deployment/**', '**/performance/**'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: broadProjectIgnores,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: broadProjectIgnores,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: broadProjectIgnores,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      testIgnore: broadProjectIgnores,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-webkit',
      testIgnore: broadProjectIgnores,
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'iphone-14-pro-max',
      testMatch: ['**/device/iphone-*.spec.ts', '**/pwa/update.spec.ts'],
      use: iphone14ProMax,
    },
    {
      name: 'ipad-pro-12-9',
      testMatch: '**/device/ipad-pro.spec.ts',
      use: ipadPro12,
    },
    {
      name: 'desktop-4k',
      testMatch: '**/device/desktop-4k.spec.ts',
      use: desktop4k,
    },
  ],
});
