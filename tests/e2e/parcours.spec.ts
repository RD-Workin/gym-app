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
  await page.getByRole('button', { name: /Exporter le tableau/ }).click();
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

test('favori : épinglé en haut de la bibliothèque et filtrable', async ({ page }) => {
  await page.goto('./#/exercices');
  const lignes = page.locator('.ui-liste > li');
  await expect(lignes.first()).toBeVisible();
  const dernier = lignes.last();
  const nom = (await dernier.locator('.ui-element-titre').textContent())!;
  await dernier.getByRole('button', { name: /^Favori/ }).click();
  await expect(lignes.first().locator('.ui-element-titre')).toHaveText(nom);
  await expect(lignes.first().getByRole('button', { name: /^Favori/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/favoris.png' });
  await page.getByRole('button', { name: /Favoris \(1\)/ }).click();
  await expect(lignes).toHaveCount(1);
});

// Premier lancement : un nouvel utilisateur voit l'accueil de bienvenue, pas l'historique des versions.
test('premier lancement : bienvenue, puis accueil sans « Quoi de neuf »', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Bienvenue')).toBeVisible();
  await expect(page.getByText('Quoi de neuf')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Démarrer une séance/ })).toBeVisible();
  await page.getByRole('button', { name: "J'ai compris" }).click();
  await expect(page.getByText('Bienvenue')).toHaveCount(0);
  await expect(page.getByText('Quoi de neuf')).toHaveCount(0);
});

test('aide « ? » : explique un terme au toucher', async ({ page }) => {
  await page.goto('./#/seance');
  await page.getByRole('button', { name: /^Démarrer / }).click();
  await page.getByRole('button', { name: 'Explication : RIR' }).click();
  await expect(page.getByRole('note')).toContainText('Reps en réserve');
});

test('composer ma séance : propositions, avis, enregistrer et démarrer', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('./#/seance');
  await page.getByRole('link', { name: 'Composer ma séance' }).click();
  await page.getByRole('button', { name: /^Push/ }).click();
  await expect(page.getByText('Choisis ton premier exercice')).toBeVisible();
  // Trois exercices proposés, choisis l'un après l'autre.
  for (let i = 0; i < 3; i++) await page.locator('.mo-propositions .ui-bouton').first().click();
  await expect(page.locator('.mo-ligne')).toHaveCount(3);
  await expect(page.getByText('Avis sur ta séance')).toBeVisible();
  await page.getByRole('button', { name: /^Descendre / }).first().click();
  await page.getByRole('button', { name: 'Enregistrer et démarrer' }).click();
  await expect(page.getByRole('button', { name: 'Valider la série' })).toBeVisible();
});

test('modifier une séance type et revenir au modèle d’origine', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('./#/seance');
  await page.getByRole('link', { name: 'Modifier Pull' }).click();
  await expect(page.getByText('Avis sur ta séance')).toBeVisible();
  const avant = await page.locator('.sc-nom-bloc').count();
  await page.getByRole('button', { name: 'Retirer l’exercice' }).first().click();
  await expect(page.locator('.sc-nom-bloc')).toHaveCount(avant - 1);
  await page.getByRole('button', { name: /Revenir au modèle d’origine/ }).click();
  await expect(page.locator('.sc-nom-bloc')).toHaveCount(avant);
  await expect(page.getByRole('button', { name: /Revenir au modèle d’origine/ })).toHaveCount(0);
});

// Exercice au poids du corps : on note le lest, négatif si on se fait aider (élastique, machine).
test('tractions : lest négatif accepté et expliqué', async ({ page }) => {
  await page.goto('./#/exercices');
  await page.locator('.ui-liste a', { hasText: /^Tractions/ }).first().click();
  await expect(page.locator('.ui-stepper-unite').filter({ hasText: 'kg de lest' }).first()).toBeVisible();
  await page.locator('#sr-charge').fill('-15');
  await page.locator('#sr-charge').blur();
  await expect(page.locator('#sr-charge')).toHaveValue('-15');
  await expect(page.locator('.ui-indication-lest')).toContainText('Aidé de 15 kg');
  await page.getByRole('button', { name: /^Enregistrer \d+ séries?/ }).click();
  await expect(page.locator('.sr-confirmation')).toContainText('-15 kg de lest');
});
