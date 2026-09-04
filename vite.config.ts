import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

type PackageMetadata = {
  version: string;
};

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageMetadata;
const base = process.env.VITE_BASE_PATH ?? '/net-worth-calculator/';

function commitSha(): string {
  const configuredSha = process.env.GITHUB_SHA ?? process.env.VITE_COMMIT_SHA;
  if (configuredSha) {
    if (!/^[0-9a-f]{40}$/i.test(configuredSha)) {
      throw new Error('Build commit identity must be an exact 40-character Git SHA.');
    }
    return configuredSha.toLowerCase();
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    if (process.env.CI === 'true' || process.env.VITE_RELEASE_BUILD === 'true') {
      throw new Error('Release builds require an exact commit identity.');
    }
    return 'dev';
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(packageMetadata.version),
    __COMMIT_SHA__: JSON.stringify(commitSha()),
    __REPOSITORY_URL__: JSON.stringify('https://github.com/DevSecNinja/net-worth-calculator'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Net Worth Calculator',
        short_name: 'Net Worth',
        description: 'Private, encrypted, local-first net worth tracking.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f4f7fb',
        theme_color: '#166534',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        globPatterns: ['**/*.{css,html,ico,png,svg,js,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/[^/?]+\.(?:json|nwvault)(?:\?.*)?$/],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
