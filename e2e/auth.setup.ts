import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const adminAuthFile = path.join(__dirname, '../playwright/.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/de/login');
  
  // Fill credentials
  await page.locator('input[type="email"]').fill('turgaycelen03@gmail.com');
  await page.locator('input[type="password"]').fill('352306');
  
  // Submit login form
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/de\/admin\/dashboard/);
  
  // Save auth state
  await page.context().storageState({ path: adminAuthFile });
});
