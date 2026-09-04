import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0-test'),
    __COMMIT_SHA__: JSON.stringify('test000'),
    __REPOSITORY_URL__: JSON.stringify('https://github.com/DevSecNinja/net-worth-calculator'),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterMock.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30_000,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/app/**',
        'src/components/**',
        'src/features/about/**',
        'src/features/backup/BackupPage.tsx',
        'src/features/dashboard/**',
        'src/features/inventory/*Dialog.tsx',
        'src/features/inventory/*Panel.tsx',
        'src/features/inventory/InventoryPage.tsx',
        'src/features/onboarding/**',
        'src/features/settings/SettingsPage.tsx',
        'src/features/vault/LockButton.tsx',
        'src/features/vault/UnlockPage.tsx',
        'src/features/vault/VaultSecurityDialogs.tsx',
        'src/pwa/PwaStatus.tsx',
        'src/components/charts/**',
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
