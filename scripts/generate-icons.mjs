import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = `${root}\\public\\icons`;
await mkdir(output, { recursive: true });

function artwork(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.08);
  const chartLeft = padding + Math.round(size * 0.14);
  const chartBottom = size - padding - Math.round(size * 0.14);
  const barWidth = Math.round(size * 0.12);
  const gap = Math.round(size * 0.08);
  const heights = [0.28, 0.44, 0.62].map((value) => Math.round(size * value));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${maskable ? 0 : Math.round(size * 0.22)}" fill="#166534"/>
      ${heights
        .map((height, index) => {
          const x = chartLeft + index * (barWidth + gap);
          return `<rect x="${x}" y="${chartBottom - height}" width="${barWidth}" height="${height}" rx="${barWidth / 3}" fill="#dcfce7"/>`;
        })
        .join('')}
      <path d="M${chartLeft - gap / 2} ${chartBottom + gap}H${size - chartLeft + gap / 2}" stroke="#86efac" stroke-width="${Math.max(4, Math.round(size * 0.04))}" stroke-linecap="round"/>
    </svg>`;
}

const icons = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-192.png', 192, true],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

for (const [filename, size, maskable] of icons) {
  await sharp(Buffer.from(artwork(size, maskable)))
    .png()
    .toFile(`${output}\\${filename}`);
}
