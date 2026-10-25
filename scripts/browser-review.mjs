import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/images', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:4173/loss_landscape/');
await page.locator('canvas').waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/images/landing.png', fullPage: true });
await page.getByRole('link', { name: 'Launch the lab' }).click();
await page.locator('canvas[data-landscape]').waitFor();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Adam', exact: true }).click();
await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('20');
await page.getByRole('button', { name: 'Run simulation', exact: true }).click();
await expectStep(page, 300);
await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
await page.screenshot({ path: 'docs/images/workspace.png', fullPage: true });
const before = await page.getByLabel('x coordinate').inputValue();
const canvas = page.locator('canvas[data-landscape]');
const box = await canvas.boundingBox();
await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.57 } });
await page.waitForTimeout(100);
const after = await page.getByLabel('x coordinate').inputValue();
await page.getByRole('button', { name: 'Run simulation', exact: true }).click();
await expectStep(page, 20);
await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
const pngDownload = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export 3D PNG', exact: true }).click();
const png = await pngDownload;
await png.saveAs('docs/images/exported-surface.png');
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/images/mobile.png', fullPage: true });
console.log(
  JSON.stringify({
    errors,
    raycast: { before, after, changed: before !== after },
    screenshots: ['docs/images/landing.png', 'docs/images/workspace.png', 'docs/images/mobile.png'],
    png: 'docs/images/exported-surface.png',
  }),
);
await browser.close();
async function expectStep(page, n) {
  await page.waitForFunction(
    (min) => Number(document.querySelector('.step-badge')?.textContent?.replace('t = ', '')) >= min,
    n,
  );
}
