# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Panel Security and Login >> should redirect unauthenticated users to the admin login page
- Location: e2e\admin.spec.ts:4:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/de\/admin/
Received string:  "http://localhost:3000/de/login?next=%2Fde%2Fadmin%2Fdashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    11 × locator resolved to <html lang="de-DE" class="__variable_1c86d0 __variable_79853d">…</html>
       - unexpected value "http://localhost:3000/de/login?next=%2Fde%2Fadmin%2Fdashboard"

```

```yaml
- heading "ElysonSweets" [level=1]
- paragraph: Willkommen im Admin-Panel
- text: E-Mail-Adresse
- textbox "E-Mail-Adresse":
  - /placeholder: admin@example.com
- text: Passwort
- textbox "Passwort":
  - /placeholder: ••••••••
- checkbox "Angemeldet bleiben" [checked]
- text: Angemeldet bleiben
- link "Passwort vergessen?":
  - /url: /de/auth/reset-password
- button "Anmelden"
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
- heading "Wir verwenden Cookies" [level=3]
- paragraph:
  - text: Wir nutzen Cookies und ähnliche Technologien, um die ordnungsgemäße Funktion unserer Website zu gewährleisten, Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anbieten zu können und die Zugriffe auf unsere Website zu analysieren.
  - link "Datenschutz":
    - /url: /de/datenschutz
- button "Nur notwendige"
- button "Alle akzeptieren"
```