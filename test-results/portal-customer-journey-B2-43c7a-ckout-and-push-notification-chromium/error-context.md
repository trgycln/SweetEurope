# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portal\customer-journey.spec.ts >> B2B Customer Portal E2E Flow >> Mobile login, catalog, cart, checkout, and push notification
- Location: tests\e2e\portal\customer-journey.spec.ts:12:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/portal\/dashboard/
Received string:  "http://localhost:3000/de/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × locator resolved to <html lang="de-DE" class="__variable_1c86d0 __variable_79853d">…</html>
       - unexpected value "http://localhost:3000/de/login"

```

```yaml
- heading "ElysonSweets" [level=1]
- paragraph: Willkommen im Admin-Panel
- text: E-Mail-Adresse
- textbox "E-Mail-Adresse":
  - /placeholder: admin@example.com
  - text: test_musteri@elysonsweets.de
- text: Passwort
- textbox "Passwort":
  - /placeholder: ••••••••
  - text: password123
- button "Şifreyi göster/gizle"
- checkbox "Angemeldet bleiben" [checked]
- text: Angemeldet bleiben
- link "Passwort vergessen?":
  - /url: /de/auth/reset-password
- button "Anmeldung läuft..." [disabled]:
  - img
  - text: Anmeldung läuft...
- paragraph: Noch kein Partner?
- link "Jetzt Partner werden":
  - /url: /de/register
  - text: Jetzt Partner werden
  - img
- link "Zurück zur Website":
  - /url: /
  - img
  - text: Zurück zur Website
- alert
```