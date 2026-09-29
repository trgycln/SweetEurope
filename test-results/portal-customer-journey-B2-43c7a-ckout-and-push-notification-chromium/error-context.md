# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portal\customer-journey.spec.ts >> B2B Customer Portal E2E Flow >> Mobile login, catalog, cart, checkout, and push notification
- Location: tests\e2e\portal\customer-journey.spec.ts:11:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]: Internal Server Error
```