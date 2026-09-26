# TASK BLUEPRINT: SEO & GEO Navigation Architecture Update
**Context:** We need to optimize the Header and Footer navigation for B2B SEO, Silo Architecture, and GEO (Generative Engine Optimization) without breaking the existing UI/Tailwind design or i18n structure.

## ⚠️ CRITICAL RULES FOR THE AI AGENT
1. Read `rules.md` before making any changes.
2. DO NOT remove existing Tailwind classes, mobile menu logic (hamburger menu), or i18n implementations.
3. Check off the tasks below as you complete them.

---

## [ ] STEP 1: Header (Main Navigation) Optimization
**Target File:** Find the main Header/Navbar component (likely `src/components/layout/Header.tsx` or `Navbar.tsx`).

**Action Required:**
1. Insert a new navigation link for the B2B Portal.
2. Reorder the main navigation links to match this exact semantic order:
   `Startseite` | `Produkte` | `B2B Großhandel` (NEW) | `Rezepte` | `Blog [NEU]` | `B2B Rechner` | `Über uns` | `Kontakt`
3. Keep the golden "Partnerportal" button exactly where it is (usually on the far right).

**New Link Implementation (Adapt to existing i18n logic):**
```tsx
<Link href={`/${locale}/b2b-portal`} className="/* KEEP EXISTING NAV ITEM CLASSES */">
  {locale === 'de' ? 'B2B Großhandel' : locale === 'tr' ? 'B2B Toptan' : locale === 'ar' ? 'B2B بالجملة' : 'B2B Wholesale'}
</Link>

STEP 2: Footer (Silo Architecture) Optimization
Target File: Find the main Footer component (likely src/components/layout/Footer.tsx).
Action Required:
Restructure the Footer links into 3 semantic columns to establish Topical Authority for AI bots. Preserve all existing Tailwind grid layouts and styling.
Column 1: Wissen & Inspiration (Knowledge & Inspiration)
Produkte -> /${locale}/products (or /katalog)
Rezept-Bibliothek -> /${locale}/recipes
Barista AI -> /${locale}/barista-ai
HORECA Blog -> /${locale}/blog
Column 2: B2B & Tools
B2B Kundenportal -> /${locale}/b2b-portal
Partner Portal -> /${locale}/partner-portal
Gewinnmargen-Rechner -> /${locale}/tools/margin-calculator
Column 3: Unternehmen (Company)
Über uns -> /${locale}/about
Kontakt -> /${locale}/contact
Impressum -> (Keep existing link)
Datenschutz -> (Keep existing link)
i18n Implementation Note:
If the translations for these new footer links do not exist in the central dictionary (src/lib/i18n/pages.ts), implement them inline using a simple ternary or switch statement based on the locale prop, just like in Step 1.
[ ] STEP 3: Final Verification
Ensure there are no TypeScript errors.
Ensure the mobile menu (if applicable) reflects the new Header links.
Do not modify any other files outside of the Header and Footer components.