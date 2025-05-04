// @ts-check
// npx playwright test tests/sf_login.ts
// npm install -g @playwright/test
import { test, expect } from '@playwright/test';

test('testsf', async ({ page }) => {
  await page.goto('https://test.salesforce.com/');
  await page.getByRole('textbox', { name: 'Nombre de usuario' }).click();
  await page.getByRole('textbox', { name: 'Nombre de usuario' }).fill('david.jurado@evolutio.com.012.prod.dev1');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('XXX');
  await page.getByRole('button', { name: 'Iniciar sesión en Sandbox' }).click();
  await page.getByRole('button', { name: 'View profile' }).click();
  await page.getByRole('link', { name: 'Log Out' }).click();
  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});