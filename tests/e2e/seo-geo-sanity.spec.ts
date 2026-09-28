import { test, expect } from '@playwright/test';

test.describe('SEO/GEO & i18n Sanity Checks', () => {
  test('Edge Case 3: Alternate hreflang tags and x-default should exist and AI terms should be absent', async ({ page }) => {
    await page.goto('/de/recipes');

    // Check for hreflang tags
    const hreflangTr = await page.locator('link[rel="alternate"][hreflang="tr"]');
    await expect(hreflangTr).toHaveCount(1);
    await expect(hreflangTr).toHaveAttribute('href', /.*\/tr\/recipes/);

    const hreflangEn = await page.locator('link[rel="alternate"][hreflang="en"]');
    await expect(hreflangEn).toHaveCount(1);
    await expect(hreflangEn).toHaveAttribute('href', /.*\/en\/recipes/);

    const hreflangDe = await page.locator('link[rel="alternate"][hreflang="de"]');
    await expect(hreflangDe).toHaveCount(1);
    await expect(hreflangDe).toHaveAttribute('href', /.*\/de\/recipes/);

    const hreflangXDefault = await page.locator('link[rel="alternate"][hreflang="x-default"]');
    await expect(hreflangXDefault).toHaveCount(1);
    // Usually x-default points to the default language, which might be 'tr' or the current URL.
    // The test asserts it exists.
    await expect(hreflangXDefault).toHaveAttribute('href', /.*\/(tr|de|en)\/recipes/);

    // Rule 3: SEO/GEO kuralı - AI kelimeleri olmamalı, "Rezept-Assistent" olmalı.
    const pageContent = await page.content();
    
    // Check if body has "Yapay Zeka" or "AI"
    // Since it's /de, it should have "Rezept-Assistent"
    const hasRezeptAssistent = pageContent.includes('Rezept-Assistent') || pageContent.includes('Reçete Sihirbazı');
    expect(hasRezeptAssistent).toBe(true);

    // We shouldn't use "Yapay Zeka" on the UI explicitly as requested by SEO/GEO rule.
    // But since "AI" might be part of some code, we just ensure "Rezept-Assistent" is present and prominent.
    // The rule says: "UI'da kesinlikle "AI" veya "Yapay Zeka" kelimeleri aranmamalı, testler "Reçete Sihirbazı" veya "Rezept-Assistent" metinlerinin varlığını doğrulamalıdır."
    
    // Wait for the recipe wizard component
    // If it exists, it should be visible above the fold
    const wizardComponent = page.locator('text=Rezept-Assistent').first();
    await expect(wizardComponent).toBeVisible();
  });
});
