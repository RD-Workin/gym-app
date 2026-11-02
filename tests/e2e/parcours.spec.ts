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

// Saisie rapide : noter un set depuis la fiche d'un exercice, sans lancer de séance.
test('fiche exercice → saisie rapide → séance libre du jour', async ({ page }) => {
  await page.goto('./#/exercices');
  await page.locator('.ui-liste a').first().click();
  // Sans historique : 3 séries proposées. On les rend différentes : 10 × 2,5 / 8 × 2,5 / 9 × 0.
  const ligne = (n: number) => page.locator('.sr-ligne').nth(n);
  const saisir = async (champ: string, v: string) => {
    await page.locator(champ).fill(v);
    await page.locator(champ).blur();
  };
  await expect(page.locator('.sr-ligne')).toHaveCount(4); // 3 séries + « + Série »
  await saisir('#sr-charge', '2,5');
  await ligne(1).click();
  await expect(ligne(1)).toHaveAttribute('aria-pressed', 'true');
  await saisir('#sr-reps', '8');
  await saisir('#sr-charge', '2,5');
  await ligne(2).click();
  await expect(ligne(2)).toHaveAttribute('aria-pressed', 'true');
  await saisir('#sr-reps', '9');
  const enregistrer = page.getByRole('button', { name: /^Enregistrer \d+ séries?/ });
  await enregistrer.click();
  await expect(page.getByText('la séance libre du jour')).toBeVisible();
  await expect(page.locator('.sr-confirmation')).toContainText('2,5 kg · 10-8');
  await expect(page.locator('.sr-confirmation')).toContainText('0 kg · 9');
  await page.getByText('la séance libre du jour').click();
  await expect(page.getByRole('heading', { name: 'Séance libre' })).toBeVisible();
  await expect(page.getByText(/1 exercices · \d+ séries/)).toBeVisible();
  await expect(page.getByText('2,5/0 kg · 10-8-9')).toBeVisible();
});
