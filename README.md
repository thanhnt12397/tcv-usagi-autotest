# Usagi Autotest Project

Project autotest sử dụng Playwright cho dự án Usagi.

## Setup Instructions

### Local Setup

```bash
# Clone the repository
git clone repo_url

# Navigate to project directory
cd usagi_autotest

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Configure environment
cp .env.example .env
# Edit .env file according to your configuration
```

### Docker Setup

```bash
# Clone the repository
git clone repo_url

# Start Docker containers
docker-compose up -d

# Access container shell
docker exec -it usagi-test bash

# Install dependencies
yarn install
```

## Playwright

### Run playwright

```bash
# Run tests in staging environment (default)
npx playwright test

# Run tests with specific TARGET
TARGET=staging npx playwright test

# Run tests in production environment
TARGET=production npx playwright test

# Run tests in local environment
TARGET=local npx playwright test

# Run specific test file
npx playwright test e2e-tests/pc/search.spec.ts

# Run tests in headed mode
npx playwright test --headed

# Run tests with UI mode
npx playwright test --ui

# Show test report
npx playwright show-report
```

## Project Structure

```
usagi_autotest/
├── e2e-tests/              # Test files for staging/dev environment
│   ├── pc/                 # PC browser tests
│   ├── sp/                 # Mobile browser tests
│   └── helpers/            # Helper functions for tests
├── e2e-tests-production/   # Test files for production environment
│   ├── pc/                 # PC browser tests
│   └── sp/                 # Mobile browser tests
├── utils/                  # Utility functions
├── playwright.config.ts    # Playwright configuration
├── package.json           # Dependencies
└── .env                   # Environment variables (create from .env.example)
```

## Environment Variables

- `TARGET`: Environment target (local, staging, production)
- `PRODUCTION_URL`: Production environment URL
- `STAGING_URL`: Staging environment URL (default: https://usagi.tcv-dev.com)
- `LOCAL_URL`: Local environment URL
- `RETRY_TIMES`: Number of retries for failed tests
- `NUMBER_OF_WORKERS`: Number of parallel workers
- `TEST_TIMEOUT`: Test timeout in milliseconds (default: 30000)

## Notes

- Default URL: https://usagi.tcv-dev.com
- Hỗ trợ test trên cả PC (Desktop Chrome) và SP (Pixel 7)
- Có thể chạy test riêng cho production và staging/dev environment
