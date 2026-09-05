import { expect, test, type Locator, type Page } from '@playwright/test';

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

function intersects(first: Box, second: Box, tolerance = 1): boolean {
  return !(
    first.x + first.width <= second.x + tolerance ||
    second.x + second.width <= first.x + tolerance ||
    first.y + first.height <= second.y + tolerance ||
    second.y + second.height <= first.y + tolerance
  );
}

async function exposeInstallAndRegistrationError(page: Page, locale = 'en-US') {
  await page.addInitScript((selectedLocale) => {
    if (location.protocol !== 'about:') localStorage.setItem('nwc-locale', selectedLocale);
    Object.defineProperty(ServiceWorkerContainer.prototype, 'register', {
      configurable: true,
      value: async () => {
        throw new Error('Intentional layout-test registration failure.');
      },
    });
  }, locale);
  await page.goto('./');
  await expect(page.locator('.pwa-actions .toast--error')).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'test' }),
    });
    window.dispatchEvent(event);
  });
}

async function expectFooterContract(page: Page, privacyText: RegExp, errorText: RegExp) {
  const footer = page.locator('.app-footer');
  const actions = page.locator('.pwa-actions');
  const privacy = footer.getByText(privacyText);
  const version = footer.getByRole('link');
  const install = actions.locator('.toast--install').getByRole('button');
  const error = actions.locator('.toast--error').filter({ hasText: errorText });

  await footer.scrollIntoViewIfNeeded();
  await expect(privacy).toBeVisible();
  await expect(version).toBeVisible();
  await expect(install).toBeVisible();
  await expect(error).toBeVisible();
  await expect(actions).toHaveAttribute('aria-label', /application status|applicatiestatus/i);

  const [footerBox, actionsBox, errorBox] = await Promise.all([
    footer.boundingBox(),
    actions.boundingBox(),
    error.boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(errorBox).not.toBeNull();
  expect(intersects(footerBox!, actionsBox!)).toBe(false);
  expect(errorBox!.width).toBeLessThanOrEqual(actionsBox!.width);
  expect(errorBox!.height).toBeGreaterThan(40);

  const layout = await page.evaluate(() => {
    const footerElement = document.querySelector<HTMLElement>('.app-footer');
    const footerStyle = footerElement ? getComputedStyle(footerElement) : undefined;
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      footerBottomPadding: footerStyle ? Number.parseFloat(footerStyle.paddingBottom) : 0,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.footerBottomPadding).toBeGreaterThan(0);
}

test('keeps desktop and short-viewport PWA states clear of the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await exposeInstallAndRegistrationError(page);
  await expectFooterContract(
    page,
    /your financial data stays in this browser/i,
    /offline setup failed/i,
  );

  await expect(page.locator('.app-footer')).toHaveCSS('align-items', 'baseline');
});

test('reflows long Dutch status content without overlap or overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await exposeInstallAndRegistrationError(page, 'nl-NL');
  await expectFooterContract(
    page,
    /je financiële gegevens blijven in deze browser/i,
    /offline instellen is mislukt/i,
  );

  const error = page.locator('.pwa-actions .toast--error');
  const style = await error.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      lineHeight: Number.parseFloat(computed.lineHeight),
      fontSize: Number.parseFloat(computed.fontSize),
    };
  });
  expect((await error.boundingBox())!.height).toBeGreaterThan(style.lineHeight + style.fontSize);
});

test('preserves the footer clearance contract at 200% reflow', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await exposeInstallAndRegistrationError(page);
  await expectFooterContract(
    page,
    /your financial data stays in this browser/i,
    /offline setup failed/i,
  );
});
