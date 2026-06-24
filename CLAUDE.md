# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright-based E2E test suite for the Usagi project, targeting both PC (Desktop Chrome) and SP (Mobile — Pixel 7) device profiles. Tests run against staging, production, or local environments.

## Commands

```bash
# Install dependencies
npm install
npx playwright install --with-deps

# Authentication setup (required before first test run)
npm run test:setup-auth          # opens a browser for manual Google login

# Run all tests
npx playwright test              # staging (default)
TARGET=production npx playwright test
TARGET=local npx playwright test

# Run a single test file
npx playwright test e2e-tests/pc/Login.spec.ts

# Debug modes
npx playwright test --ui         # interactive UI mode
npx playwright test --headed     # visible browser

# View report
npx playwright show-report
```

Environment variables can be set via `.env` (copy from `.env.example`) or as CLI exports:
- `TARGET` — `local` | `staging` | `production`
- `PRODUCTION_URL`, `STAGING_URL`, `LOCAL_URL` — base URLs
- `RETRY_TIMES` — retry count (default: 0)
- `NUMBER_OF_WORKERS` — parallel workers
- `TEST_TIMEOUT` — timeout in ms (default: 30000)

## Architecture

### Test Directories

Two parallel test suites driven by `TARGET`:
- `e2e-tests/` — staging/dev tests (default)
- `e2e-tests-production/` — production tests (activated via `TARGET=production`)

Each directory mirrors the same `pc/` and `sp/` layout with per-device tests.

### Configuration

**`playwright.config.ts`** — central config: reads `.env`, selects `baseURL` from `TARGET`, checks for `.auth/user.json` to conditionally inject `storageState`, and registers two Playwright projects (Chrome PC, Pixel 7 SP).

**`playwright.setup.config.ts`** — separate config used only by `npm run test:setup-auth`, with extended timeouts (6 min) to allow manual Google login.

### Authentication

Google auth requires a one-time manual setup:
1. Run `npm run test:setup-auth` — opens a headed browser.
2. Complete Google sign-in manually.
3. Session is saved to `.auth/user.json` (gitignored).
4. Subsequent test runs inject this state automatically via `storageState`.

`auth.setup.ts` is the global setup file that validates or creates auth state before tests run.

### Helpers

Shared utilities under `e2e-tests/helpers/`:
- `auth-helper.ts` — checks auth state, detects Google account presence
- `login-helper.ts` — navigation to login page, button interaction
- `common-helper.ts` — dropdown selection, page title assertions, load waits

`utils/navigation-utils.ts` — click + URL path verification utility shared across both test suites.

### Docker

```bash
docker-compose up   # runs tests inside node:20.14.0-slim container
```

The container mounts the project directory to `/var/usagi`.
