# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Panel Security and Login >> should show error for invalid admin credentials
- Location: e2e\admin.spec.ts:20:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Giriş|Login/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "ElysonSweets" [level=1] [ref=e5]
      - paragraph [ref=e6]: Willkommen im Admin-Panel
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: E-Mail-Adresse
        - textbox "E-Mail-Adresse" [ref=e10]:
          - /placeholder: admin@example.com
          - text: invalid@elysonsweets.de
      - generic [ref=e11]:
        - generic [ref=e12]: Passwort
        - textbox "Passwort" [active] [ref=e13]:
          - /placeholder: ••••••••
          - text: wrongpassword123
      - generic [ref=e14]:
        - generic [ref=e15]:
          - checkbox "Angemeldet bleiben" [checked] [ref=e16]
          - generic [ref=e17]: Angemeldet bleiben
        - link "Passwort vergessen?" [ref=e19] [cursor=pointer]:
          - /url: /de/auth/reset-password
      - button "Anmelden" [ref=e21] [cursor=pointer]
    - generic [ref=e22]:
      - paragraph [ref=e23]: Noch kein Partner?
      - link "Jetzt Partner werden" [ref=e24] [cursor=pointer]:
        - /url: /de/register
    - link "Zurück zur Website" [ref=e28] [cursor=pointer]:
      - /url: /
  - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]
  - alert [ref=e40]
  - generic [ref=e42]:
    - generic [ref=e43]:
      - heading "Wir verwenden Cookies" [level=3] [ref=e44]
      - paragraph [ref=e45]:
        - text: Wir nutzen Cookies und ähnliche Technologien, um die ordnungsgemäße Funktion unserer Website zu gewährleisten, Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anbieten zu können und die Zugriffe auf unsere Website zu analysieren.
        - link "Datenschutz" [ref=e46] [cursor=pointer]:
          - /url: /de/datenschutz
    - generic [ref=e47]:
      - button "Nur notwendige" [ref=e48] [cursor=pointer]
      - button "Alle akzeptieren" [ref=e49] [cursor=pointer]
```