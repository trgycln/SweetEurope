# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: supplier-order-pipeline.spec.ts >> Supply Chain Pipeline — UI E2E Testleri >> Liste sayfası yüklenir ve "Yeni Sipariş Planı" butonu görünür
- Location: tests\e2e\supplier-order-pipeline.spec.ts:45:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Tedarik Zinciri"
Received string:    "ElysonSweets"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    13 × locator resolved to <h1 class="font-serif text-5xl font-bold text-primary">ElysonSweets</h1>
       - unexpected value "ElysonSweets"

```

```yaml
- heading "ElysonSweets" [level=1]
```