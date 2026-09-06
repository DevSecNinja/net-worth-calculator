import { expect, test, type Locator, type Page } from '@playwright/test';

import { createVault } from '../helpers/app';

function chartCard(page: Page, title: RegExp): Locator {
  return page.locator('.chart-card').filter({ has: page.getByRole('heading', { name: title }) });
}

async function hoverChartPlot(card: Locator, xRatio = 0.55): Promise<void> {
  const plot = card.locator('.recharts-wrapper');
  await plot.scrollIntoViewIfNeeded();
  const box = await plot.boundingBox();
  if (!box) throw new Error('Chart plot is not visible.');
  await plot.page().mouse.move(box.x + box.width * xRatio, box.y + box.height * 0.45);
}

async function hoverPieSector(sector: Locator): Promise<void> {
  const box = await sector.boundingBox();
  if (!box) throw new Error('Pie sector is not visible.');
  const event = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
  await sector.dispatchEvent('mouseover', event);
  await sector.dispatchEvent('mousemove', event);
}

async function interactWithPie(
  card: Locator,
  interaction: 'hover' | 'tap' | 'click',
): Promise<void> {
  const sector = card.locator('.recharts-pie-sector path').first();
  if (interaction === 'tap') {
    await sector.dispatchEvent('touchstart');
    await sector.dispatchEvent('click');
  } else if (interaction === 'click') {
    await sector.dispatchEvent('click');
  } else {
    await hoverPieSector(sector);
  }
}

async function expectTooltipHorizontallyBounded(
  tooltip: Locator,
  card: Locator,
  viewportWidth: number,
): Promise<void> {
  const [tooltipBounds, scrollportBounds] = await Promise.all([
    tooltip.boundingBox(),
    card.locator('.chart-card__visual').boundingBox(),
  ]);
  if (!tooltipBounds || !scrollportBounds) throw new Error('Tooltip or chart is not visible.');
  expect(tooltipBounds.x).toBeGreaterThanOrEqual(Math.max(0, scrollportBounds.x));
  expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(
    Math.min(viewportWidth, scrollportBounds.x + scrollportBounds.width),
  );
}

test('shows meaningful hover details for every chart family', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Desktop hover coverage');
  test.setTimeout(90_000);
  await createVault(page, true);

  const allocation = chartCard(page, /asset allocation/i);
  await interactWithPie(allocation, 'hover');
  await expect(allocation.getByTestId('chart-tooltip')).toContainText(/property/i);
  await expect(allocation.getByTestId('chart-tooltip')).toContainText(/\$330,000\.00/);
  await expect(allocation.getByTestId('chart-tooltip')).toContainText(/%/);

  const trend = chartCard(page, /net worth trend/i);
  await hoverChartPlot(trend);
  await expect(trend.getByTestId('chart-tooltip')).toContainText(/assets/i);
  await expect(trend.getByTestId('chart-tooltip')).toContainText(/liabilities/i);
  await expect(trend.getByTestId('chart-tooltip')).toContainText(/net worth/i);
  await expect(trend.getByTestId('chart-tooltip')).toContainText(/complete/i);

  const balance = chartCard(page, /^assets and liabilities$/i);
  await hoverChartPlot(balance);
  await expect(balance.getByTestId('chart-tooltip')).toContainText(/net worth/i);
  await expect(balance.getByTestId('chart-tooltip')).toContainText(/debt source/i);

  const annual = chartCard(page, /annual net worth change/i);
  await annual.locator('.recharts-bar-rectangle path').first().hover();
  await expect(annual.getByTestId('chart-tooltip')).toContainText(/change/i);
  await expect(annual.getByTestId('chart-tooltip')).toContainText(/percentage/i);

  const payoff = chartCard(page, /liability payoff/i);
  await hoverChartPlot(payoff);
  await expect(payoff.getByTestId('chart-tooltip')).toContainText(/home mortgage/i);
  await expect(payoff.getByTestId('chart-tooltip')).toContainText(/actual|projected/i);

  const timeline = chartCard(page, /exact net worth timeline/i);
  await hoverChartPlot(timeline, 0.8);
  await expect(timeline.getByTestId('chart-tooltip')).toContainText(/asset source/i);
  await expect(timeline.getByTestId('chart-tooltip')).toContainText(/liability source/i);

  expect(browserName).toMatch(/chromium|firefox|webkit/);
});

test('supports touch selection and keyboard table fallback', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'Mobile touch coverage');
  await createVault(page, true);

  const allocation = chartCard(page, /asset allocation/i);
  await interactWithPie(allocation, 'tap');
  const selected = allocation.getByTestId('chart-selected-detail');
  await expect(selected).toContainText(/property/i);
  await expect(selected).toContainText(/%/);

  await expect(allocation).toContainText(/keyboard users can open the data table below/i);
  const tableToggle = allocation.getByText(/view asset allocation data table/i);
  await tableToggle.focus();
  await expect(tableToggle).toBeFocused();
  await tableToggle.press('Enter');
  await expect(allocation.getByRole('table', { name: /asset allocation for/i })).toContainText(
    /property/i,
  );
});

test('keeps Dutch details localized and bounded in a narrow dark viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Focused locale and layout coverage');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['nl-NL', 'en-US'],
    });
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('./');
  await page.getByLabel(/^wachtzin$/i).fill('correct horse battery staple');
  await page.getByLabel(/bevestig wachtzin/i).fill('correct horse battery staple');
  await page.getByRole('button', { name: /met voorbeeldgegevens maken/i }).click();
  await expect(page.getByRole('heading', { name: /nettovermogendashboard/i })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('nwc-theme', 'dark');
  });

  const allocation = chartCard(page, /verdeling bezittingen/i);
  const tooltip = allocation.getByTestId('chart-tooltip');
  const sectors = allocation.locator('.recharts-pie-sector path');
  const sectorCount = await sectors.count();
  const representativeIndexes = [
    ...new Set([0, Math.floor((sectorCount - 1) / 2), sectorCount - 1]),
  ];
  for (const index of representativeIndexes) {
    await hoverPieSector(sectors.nth(index));
    await expect(tooltip.locator('.chart-tooltip__title')).toHaveText(/\S/);
    await expect(tooltip).toContainText(/percentage van totaal/i);
    await expect(tooltip).toContainText(/\d,\d+%/);
    await expect(tooltip).toContainText(/€|\$/);
    await expectTooltipHorizontallyBounded(tooltip, allocation, 320);
  }

  const chartVisual = allocation.locator('.chart-card__visual');
  await chartVisual.evaluate((element) => {
    const svg = element.querySelector('svg');
    if (!svg) throw new Error('Expected the chart visual to contain an SVG.');
    svg.style.minWidth = '40rem';
    element.scrollLeft = element.scrollWidth;
  });
  await hoverPieSector(sectors.last());
  await expectTooltipHorizontallyBounded(tooltip, allocation, 320);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await hoverPieSector(sectors.first());
  await expect(tooltip.locator('.chart-tooltip__title')).toHaveText(/\S/);
  await expect(tooltip).toContainText(/percentage van totaal/i);
  await expectTooltipHorizontallyBounded(tooltip, allocation, 320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('uses UK date and currency conventions in selected details', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Focused UK locale coverage');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['en-GB', 'en-US'],
    });
  });
  await createVault(page, true);

  const allocation = chartCard(page, /asset allocation/i);
  await interactWithPie(allocation, 'click');
  await expect(allocation.getByTestId('chart-selected-detail')).toContainText(/£|US\$/);
  await expect(allocation.getByTestId('chart-selected-detail')).toContainText(/\d{1,2} Sept \d{4}/);
});
