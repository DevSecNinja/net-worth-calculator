import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { createVault } from '../helpers/app';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const reflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth + 1);
}

test('runs axe with contrast enabled across every core screen and dialog', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await expectNoSeriousViolations(page);
  await expect(
    page.getByRole('heading', { name: /how this calculator defines net worth/i }),
  ).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 320, height: 900 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole('link', { name: /^about$/i }).click();
  await expect(
    page.getByRole('heading', { name: /how this calculator defines net worth/i }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: /settings/i }).click();
  await expectNoSeriousViolations(page);

  await createVault(page, true);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousViolations(page);
  const methodologyLink = page.getByRole('link', { name: /how net worth is calculated/i });
  await methodologyLink.focus();
  await expect(methodologyLink).toBeFocused();
  await methodologyLink.press('Enter');
  await expect(page).toHaveURL(/#\/about#methodology$/);
  const methodologyHeading = page.getByRole('heading', {
    name: /how this calculator defines net worth/i,
  });
  await expect(methodologyHeading).toBeVisible();
  await expect(methodologyHeading).toBeFocused();
  await expect(methodologyHeading).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: /^assets$/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /add asset/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /close add asset/i }).click();

  await page.getByRole('link', { name: /^liabilities$/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /add liability/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /close add liability/i }).click();

  await page.getByRole('link', { name: /^backup$/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: /^settings$/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /change passphrase/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /close change passphrase/i }).click();
  await page.getByRole('button', { name: /delete vault/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /close delete encrypted vault/i }).click();
  await page.getByRole('button', { name: /lock vault/i }).click();
  await page.goto('./');
  await page.setViewportSize({ width: 640, height: 900 });
  await page.getByRole('button', { name: /delete local vault and start over/i }).click();
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  }
  await expectNoSeriousViolations(page);
  const resetDialog = page.getByRole('dialog', { name: /delete local vault and start over/i });
  const resetReflow = await resetDialog.evaluate((dialog) => ({
    right: dialog.getBoundingClientRect().right,
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(resetReflow.right).toBeLessThanOrEqual(resetReflow.viewport + 1);
  expect(resetReflow.scrollWidth).toBeLessThanOrEqual(resetReflow.viewport + 1);
  await page.keyboard.press('Escape');
  await expect(resetDialog).not.toBeVisible();
});

test('supports keyboard focus, error recovery, real zoom-scale reflow, motion, safe areas, and live regions', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.locator('body').evaluate((body) => {
    body.tabIndex = -1;
    body.focus();
  });
  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  if (browserName === 'webkit') {
    const currency = page.getByRole('combobox', { name: /base currency/i });
    await currency.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/^passphrase$/i)).toBeFocused();
    await skipLink.focus();
  } else {
    await page.keyboard.press('Tab');
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await createVault(page);
  await page.getByRole('link', { name: /^assets$/i }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /add your first asset/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: /add asset/i })).toBeVisible();
  await page.getByRole('button', { name: /save asset/i }).focus();
  await page.keyboard.press('Enter');
  const errorSummary = page.getByRole('alert');
  await expect(errorSummary).toContainText('Name is required');
  await expect(errorSummary).toBeFocused();

  await page.setViewportSize({ width: 640, height: 900 });
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(2);
  }
  const reflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportFit: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    safeAreaRules: [...document.styleSheets].some((sheet) =>
      [...sheet.cssRules].some((rule) => rule.cssText.includes('safe-area-inset')),
    ),
    motion: getComputedStyle(document.querySelector('button')!).animationDuration,
  }));
  expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth + 1);
  expect(reflow.viewportFit).toContain('viewport-fit=cover');
  expect(reflow.safeAreaRules).toBe(true);
  expect(['0.01ms', '1e-05s', '0.00001s']).toContain(reflow.motion);

  const targets = await page
    .locator('button:visible, input:visible, select:visible, a:visible')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          name: element.textContent ?? element.getAttribute('aria-label'),
          width: rectangle.width,
          height: rectangle.height,
        };
      }),
    );
  expect(targets.length).toBeGreaterThan(0);
  expect(targets.filter(({ width, height }) => width < 24 || height < 24)).toEqual([]);

  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  }
  await page.getByRole('button', { name: /close add asset/i }).click();
  await page.getByRole('link', { name: /settings/i }).click();
  await page.getByRole('combobox', { name: 'Currency', exact: true }).selectOption('EUR');
  await page.getByLabel(/reinterpreted as EUR/i).check();
  await page.getByRole('button', { name: /apply currency/i }).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    /Base currency changed to EUR. Existing numbers were not converted./i,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/^Offline - encrypted local data remains available$/i)).toBeVisible();
});
