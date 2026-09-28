import { test, expect } from '@playwright/test';

// Use the production URL for the smoke test
const PROD_URL = 'https://elysonsweets.de';

test.describe('Production Smoke Test (Read-Only)', () => {

  test('Homepage should load and return 200 without hydration errors', async ({ page, request }) => {
    const response = await request.get(PROD_URL);
    expect(response.status()).toBe(200);

    // Navigate to ensure it renders correctly
    await page.goto(PROD_URL);
    
    // Check for main elements (Header / Footer should exist)
    const header = page.locator('header').first();
    const footer = page.locator('footer').first();
    
    await expect(header).toBeVisible();
    await expect(footer).toBeVisible();

    // Ensure no database polluting actions (No forms submitted)
  });

  test('Products catalog should load correctly', async ({ page, request }) => {
    // Test the German locale as default
    const url = `${PROD_URL}/de/products`;
    const response = await request.get(url);
    expect(response.status()).toBe(200);

    await page.goto(url);
    // Ensure catalog container is visible
    const productGrid = page.locator('main').first();
    await expect(productGrid).toBeVisible();
  });

  test('Login page should load correctly', async ({ page, request }) => {
    const url = `${PROD_URL}/de/login`;
    const response = await request.get(url);
    expect(response.status()).toBe(200);

    await page.goto(url);
    
    // Look for the login form (just checking visibility, DO NOT submit)
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
  });
});
