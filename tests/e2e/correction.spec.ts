import { expect, test } from '@playwright/test';

// Corriger une perf déjà notée (séance libre du jour) : mise à jour, pas de doublon.
test('noter une perf puis la corriger, depuis la fiche et depuis la séance', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('./#/exercices');
  await page.locator('.ui-liste a').first().click();
  const saisir = async (sel: string, v: string) => {
    await page.locator(sel).fill(v);
    await page.locator(sel).blur();
  };
  await expect(page.locator('#sr-reps')).toBeVisible();
  await saisir('#sr-reps', '12');
  await page.getByRole('button', { name: /^Enregistrer \d+ séries?/ }).click();
  await expect(page.locator('.sr-confirmation')).toBeVisible();

  // Correction depuis la fiche : S1 passe de 12 à 11 reps.
  await page.locator('.sr-confirmation').getByRole('button', { name: 'Corriger' }).click();
  await expect(page.getByRole('button', { name: 'Enregistrer la correction' })).toBeVisible();
  await saisir('#sr-reps', '11');
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByText('✓ Séries corrigées')).toBeVisible();
  const deja = page.locator('.sr-deja');
  await expect(deja).toContainText('11-10-10');

  // La séance libre du jour garde un seul exercice, 3 séries.
  await page.goto('./#/seance');
  await page.locator('a[href*="#/seance/"]').filter({ hasText: 'Séance libre' }).first().click();
  await expect(page.getByText(/1 exercices · 3 séries/)).toBeVisible();

  // Correction depuis la séance : on retire une série.
  await page.getByRole('button', { name: /^Corriger les séries de/ }).click();
  await page.locator('.sr-ligne').nth(2).click();
  await page.getByRole('button', { name: 'Retirer S3' }).click();
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByText(/1 exercices · 2 séries/)).toBeVisible();
  await expect(page.getByText(/· 11-10$/)).toBeVisible();
});
