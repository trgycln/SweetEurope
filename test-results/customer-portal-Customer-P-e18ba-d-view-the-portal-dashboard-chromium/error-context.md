# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-portal.spec.ts >> Customer Portal & Payment Flows >> 1. Customer can log in and view the portal dashboard
- Location: tests\e2e\customer-portal.spec.ts:33:7

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/de/portal/dashboard", waiting until "load"

```