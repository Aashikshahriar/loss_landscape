import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
test('core workspace automated WCAG checks and keyboard skip link', async ({ page }) => {
  await page.goto('./#/lab');
  await page.getByRole('button', { name: '2D contours' }).click();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Control+Home');
  await page.locator('body').click({ position: { x: 3, y: 3 } });
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  expect(page.url()).toContain('#/lab');
});
test('dark theme workspace and story page pass automated WCAG checks', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/lab');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: '2D contours' }).click();
  const lab = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(lab.violations).toEqual([]);
  await page.getByRole('link', { name: 'The story', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lost in the fog' })).toBeVisible();
  const story = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(story.violations).toEqual([]);
});
test('3D picking, PNG export, and view switching have no page errors', async ({ page, browserName }) => {
  test.skip(
    browserName === 'firefox',
    'Headless Firefox WebGL availability varies; contour workflows are covered separately.',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.getByRole('link', { name: 'Launch the lab' }).click();
  await page.locator('canvas[data-landscape]').waitFor();
  await page.waitForTimeout(300);
  const canvas = page.locator('canvas[data-landscape]'),
    box = (await canvas.boundingBox())!;
  const start = await page.getByLabel('x coordinate').inputValue();
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.57 } });
  await expect(page.getByLabel('x coordinate')).not.toHaveValue(start);
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export 3D PNG', exact: true }).click();
  expect((await dl).suggestedFilename()).toContain('.png');
  await page.getByRole('button', { name: '2D contours' }).click();
  await page.getByRole('button', { name: '3D surface' }).click();
  await page.getByRole('link', { name: 'Experiments', exact: true }).click();
  await page.waitForTimeout(100);
  expect(errors).toEqual([]);
});
