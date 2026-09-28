# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portal-subdealer-pricing.spec.ts >> Portal - Alt Bayi (Sub-dealer) Fiyat İzolasyonu >> Alt Bayi için fiyatın miktar artsa bile değişmediğini doğrula
- Location: tests\e2e\portal-subdealer-pricing.spec.ts:4:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "ElysonSweets" [level=1] [ref=e6]
      - paragraph [ref=e7]: Willkommen im Admin-Panel
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: E-Mail-Adresse
        - textbox "E-Mail-Adresse" [ref=e11]:
          - /placeholder: admin@example.com
          - text: altbayi@test.com
      - generic [ref=e12]:
        - generic [ref=e13]: Passwort
        - textbox "Passwort" [ref=e14]:
          - /placeholder: ••••••••
          - text: password123
      - generic [ref=e15]:
        - generic [ref=e16]:
          - checkbox "Angemeldet bleiben" [checked] [ref=e17]
          - generic [ref=e18]: Angemeldet bleiben
        - link "Passwort vergessen?" [ref=e20] [cursor=pointer]:
          - /url: /de/auth/reset-password
      - generic [ref=e21]:
        - paragraph [ref=e22]: Anmeldung fehlgeschlagen
        - paragraph [ref=e23]: E-Mail oder Passwort falsch. Bitte versuchen Sie es erneut.
      - button "Anmelden" [ref=e25] [cursor=pointer]
    - generic [ref=e26]:
      - paragraph [ref=e27]: Noch kein Partner?
      - link "Jetzt Partner werden" [ref=e28] [cursor=pointer]:
        - /url: /de/register
    - link "Zurück zur Website" [ref=e32] [cursor=pointer]:
      - /url: /
  - generic [ref=e39] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e40]
    - generic [ref=e44]:
      - button "Open issues overlay" [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: "0"
          - generic [ref=e48]: "1"
        - generic [ref=e49]: Issue
      - button "Collapse issues badge" [ref=e50]
  - alert [ref=e53]
  - generic [ref=e55]:
    - generic [ref=e56]:
      - heading "Wir verwenden Cookies" [level=3] [ref=e57]
      - paragraph [ref=e58]:
        - text: Wir nutzen Cookies und ähnliche Technologien, um die ordnungsgemäße Funktion unserer Website zu gewährleisten, Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anbieten zu können und die Zugriffe auf unsere Website zu analysieren.
        - link "Datenschutz" [ref=e59] [cursor=pointer]:
          - /url: /de/datenschutz
    - generic [ref=e60]:
      - button "Nur notwendige" [ref=e61] [cursor=pointer]
      - button "Alle akzeptieren" [ref=e62] [cursor=pointer]
```