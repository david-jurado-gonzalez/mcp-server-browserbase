# Test info

- Name: testsf
- Location: C:\Users\David\Documents\MCP\mcp-server-browserbase\stagehand-mcp\src\tests\example2.spec.ts:6:1

# Error details

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: 'Nombre de usuario' })

    at C:\Users\David\Documents\MCP\mcp-server-browserbase\stagehand-mcp\src\tests\example2.spec.ts:8:66
```

# Page snapshot

```yaml
- text: Salesforce Username
- textbox "Username"
- text: Password
- textbox "Password"
- button "Log In to Sandbox"
- checkbox "Remember me"
- text: Remember me
- link "Forgot Your Password?":
  - /url: /secur/forgotpassword.jsp?locale=us
- link "Use Custom Domain":
  - /url: javascript:void(0);
- text: © 2025 Salesforce, Inc. All rights reserved. |
- link "Privacy":
  - /url: https://www.salesforce.com/us/company/privacy
- iframe
- text: Login
```

# Test source

```ts
   1 | // @ts-check
   2 | // npx playwright test tests/sf_login.ts
   3 | // npm install -g @playwright/test
   4 | import { test, expect } from '@playwright/test';
   5 |
   6 | test('testsf', async ({ page }) => {
   7 |   await page.goto('https://test.salesforce.com/');
>  8 |   await page.getByRole('textbox', { name: 'Nombre de usuario' }).click();
     |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
   9 |   await page.getByRole('textbox', { name: 'Nombre de usuario' }).fill('david.jurado@evolutio.com.012.prod.dev1');
  10 |   await page.getByRole('textbox', { name: 'Contraseña' }).click();
  11 |   await page.getByRole('textbox', { name: 'Contraseña' }).fill('15121512$m0588V1');
  12 |   await page.getByRole('button', { name: 'Iniciar sesión en Sandbox' }).click();
  13 |   await page.getByRole('button', { name: 'View profile' }).click();
  14 |   await page.getByRole('link', { name: 'Log Out' }).click();
  15 |   // Expects page to have a heading with the name of Installation.
  16 |   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  17 | });
```