import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { simulate } from '../../src/math/engine';
import type { Experiment } from '../../src/types';
test('landing, lab, real steps, replay, and accessible inspector', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /walk through/i })).toBeVisible();
  await page.getByRole('link', { name: 'Launch the lab' }).click();
  await page.getByRole('button', { name: '2D contours' }).click();
  await page.getByLabel('Objective function').selectOption('quadratic');
  await page.getByLabel('x coordinate').fill('1');
  await page.getByLabel('x coordinate').press('Enter');
  await page.getByLabel('y coordinate').fill('2');
  await page.getByLabel('y coordinate').press('Enter');
  await expect(page.locator('.loss-metric strong')).toHaveText('5.00000');
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 1');
  await expect(page.locator('.loss-metric strong')).toHaveText('3.52800');
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await page.getByRole('slider', { name: 'Recorded step', exact: true }).fill('0');
  await expect(page.locator('.loss-metric strong')).toHaveText('5.00000');
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 0');
});
test('CSV/JSON exports and IndexedDB restore', async ({ page }) => {
  await page.goto('./#/lab');
  await page.getByRole('button', { name: '2D contours' }).click();
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await page.getByLabel('Experiment name').fill('Browser round trip');
  await page.getByRole('dialog').getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Trajectory CSV' }).click();
  expect((await csv).suggestedFilename()).toContain('.csv');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const json = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Experiment JSON' }).click();
  expect((await json).suggestedFilename()).toContain('.json');
  await page.getByRole('link', { name: 'Experiments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser round trip' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 1');
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 2');
});
test('racing starts match; contour placement resets all runs', async ({ page }) => {
  await page.goto('./#/lab');
  await page.getByRole('button', { name: '2D contours' }).click();
  await page.getByRole('button', { name: 'Adam', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.locator('#contour-chart').click({ position: { x: 200, y: 180 } });
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('1');
  await expect(page.locator('tbody tr').nth(1)).toContainText('1');
});
test('mobile essential workflow and production base path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  const missing: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('127.0.0.1')) missing.push(r.url());
  });
  await page.goto('./#/lab');
  await expect(page.getByRole('button', { name: '2D contours' })).toBeVisible();
  await page.getByRole('button', { name: 'setup', exact: true }).click();
  await page.getByLabel('Objective function').selectOption('quadratic');
  await page.getByRole('button', { name: 'landscape', exact: true }).click();
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await page.getByRole('button', { name: 'inspector', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(failures).toEqual([]);
  expect(missing).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: 'landscape', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('JSON import resumes a seeded noisy run at the exact next update', async ({ page }) => {
  await page.goto('./#/lab');
  await page.getByRole('button', { name: '2D contours' }).click();
  await page.getByLabel('Objective function').selectOption('noisy-quadratic');
  await page.getByRole('button', { name: /Noisy gradient/ }).click();
  await page.getByRole('button', { name: /Gradient descent/ }).click();
  for (let t = 1; t <= 5; t++) {
    await page.getByRole('button', { name: 'Single step', exact: true }).click();
    await expect(page.locator('.step-badge')).toHaveText(`t = ${t}`);
  }
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Experiment JSON' }).click();
  const path = (await (await downloadPromise).path())!;
  const imported = JSON.parse(await readFile(path, 'utf8')) as Experiment;
  const expected = simulate({ ...imported.config, maxIterations: 6 }, 'noisy').history.at(-1)!;
  await page.getByRole('link', { name: 'Experiments', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByRole('heading', { name: 'Untitled experiment' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 5');
  await page.getByRole('button', { name: 'Single step', exact: true }).click();
  await expect(page.locator('.step-badge')).toHaveText('t = 6');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const resumedDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Experiment JSON' }).click();
  const resumed = JSON.parse(await readFile((await (await resumedDownload).path())!, 'utf8')) as Experiment;
  const actual = resumed.runs[0].history.at(-1)!;
  expect(actual.theta).toEqual(expected.theta);
  expect(actual.oracleGradient).toEqual(expected.oracleGradient);
  expect(actual.loss).toEqual(expected.loss);
});
