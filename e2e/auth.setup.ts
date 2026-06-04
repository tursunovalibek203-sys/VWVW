import { test as setup } from '@playwright/test';
import { login } from './helpers/auth';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await login(page);
  // storageState saves cookies + localStorage (JWT token) for reuse
  await page.context().storageState({ path: authFile });
});
