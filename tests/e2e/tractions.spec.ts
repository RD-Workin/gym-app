import { expect, test } from '@playwright/test';

// Tractions : noter la hauteur atteinte (schéma) et l'explosivité, puis la retrouver dans la séance faite.
test('noter la hauteur atteinte et une série explosive', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('./#/exercices');
  await page.locator('.ui-liste a', { hasText: /^Tractions(?! australiennes)/ }).first().click();
  await expect(page.locator('#sr-reps')).toBeVisible();
  await page.getByRole('button', { name: /^Barre :/ }).click();
  await page.locator('.tr-schema .ui-sh-repere', { hasText: 'pecs' }).dispatchEvent('pointerdown');
  await expect(page.getByRole('button', { name: /^Barre : pecs/ })).toBeVisible();
  await page.getByRole('button', { name: '⚡ Explosives' }).click();
  await page.getByRole('button', { name: /^Enregistrer \d+ séries?/ }).click();
  await expect(page.locator('.sr-confirmation')).toBeVisible();

  await page.goto('./#/seance');
  await page.locator('a[href*="#/seance/"]').filter({ hasText: 'Séance libre' }).first().click();
  await expect(page.getByText(/S1 : barre aux pecs, explosive/)).toBeVisible();
  await expect(page.locator('.sc-hauteurs svg')).toBeVisible();
});
