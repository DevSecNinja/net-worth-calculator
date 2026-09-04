import { execFileSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('Dual-base verification must run through npm.');
}

const cases = [
  { name: 'custom-domain root', base: '/' },
  { name: 'GitHub Pages project path', base: '/net-worth-calculator/' },
];

for (const buildCase of cases) {
  console.log(`Building and verifying ${buildCase.name} (${buildCase.base})...`);
  execFileSync(process.execPath, [npmCli, 'run', 'build'], {
    env: { ...process.env, VITE_BASE_PATH: buildCase.base },
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['scripts/verify-build.mjs'], {
    env: {
      ...process.env,
      EXPECTED_BASE_PATH: buildCase.base,
      VITE_BASE_PATH: buildCase.base,
    },
    stdio: 'inherit',
  });
}
