import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Parcours clé : démarrer une séance, saisir une série, terminer, exporter.
test('séance → série → export CSV', async ({ page }) => {
  page.on('dialog', (d) => d.accept());

  await page.goto('./#/seance');
  await page.getByRole('button', { name: /^Démarrer / }).click();

  const valider = page.getByRole('button', { name: 'Valider la série' });
  await expect(valider).toBeEnabled();
  await valider.click();
  await expect(page.locator('.sc-serie.fait')).toHaveCount(1);

  await page.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/seance\/.+/);

  await page.goto('./#/donnees');
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exporter le tableau \(CSV\)/ }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toMatch(/\.csv$/);
  const csv = await readFile((await fichier.path())!, 'utf8');
  expect(csv.trim().split('\n').length).toBeGreaterThanOrEqual(2); // en-tête + la série
});

test('fonctionne hors ligne après le premier chargement', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
});
