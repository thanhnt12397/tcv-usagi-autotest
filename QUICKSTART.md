# Hướng dẫn nhanh - Usagi Autotest

## Bước 1: Cài đặt Dependencies

```bash
cd /Users/thanhnt/Documents/Projects/autotest/usagi_autotest

# Cài đặt packages
npm install

# Cài đặt Playwright browsers
npx playwright install --with-deps
```

## Bước 2: Cấu hình Environment

File `.env` đã được tạo sẵn với URL mặc định của Usagi:

```
STAGING_URL=https://usagi.tcv-dev.com
```

Nếu cần test với URL khác, bạn có thể chỉnh sửa file `.env`:

```bash
# Ví dụ:
PRODUCTION_URL=https://usagi.production.com
STAGING_URL=https://usagi.tcv-dev.com
LOCAL_URL=http://localhost:3000
```

## Bước 3: Chạy Tests

### Chạy tất cả tests với URL mặc định (https://usagi.tcv-dev.com)

```bash
npx playwright test
```

### Chạy tests với staging environment

```bash
TARGET=staging npx playwright test
```

### Chạy tests với production environment

```bash
TARGET=production npx playwright test
```

### Chạy tests với local environment

```bash
TARGET=local npx playwright test
```

### Chạy tests cho PC browser only

```bash
npx playwright test --project="Chrome PC"
```

### Chạy tests cho Mobile (SP) only

```bash
npx playwright test --project="Pixel 7 SP"
```

### Chạy một test file cụ thể

```bash
# PC test
npx playwright test e2e-tests/pc/homepage.spec.ts

# Mobile (SP) test
npx playwright test e2e-tests/sp/homepage.spec.ts
```

### Chạy tests ở chế độ headed (hiển thị browser)

```bash
npx playwright test --headed
```

### Chạy tests với UI mode (interactive)

```bash
npx playwright test --ui
```

### Debug một test cụ thể

```bash
npx playwright test e2e-tests/pc/homepage.spec.ts --debug
```

## Bước 4: Xem Test Report

Sau khi chạy tests, xem report:

```bash
npx playwright show-report
```

## Bước 5: Chạy với Docker (Optional)

Nếu muốn chạy tests trong Docker container:

```bash
# Build và start container
docker-compose up -d

# Vào container
docker exec -it usagi-test bash

# Trong container, cài đặt dependencies
yarn install

# Chạy tests
npx playwright test
```

## Cấu trúc Test Files

- `e2e-tests/pc/` - Tests cho PC browser (staging/dev)
- `e2e-tests/sp/` - Tests cho Mobile browser (staging/dev)
- `e2e-tests-production/pc/` - Tests cho PC browser (production)
- `e2e-tests-production/sp/` - Tests cho Mobile browser (production)

## Tips

1. **Chạy tests nhanh**: Sử dụng `--workers=1` để chạy tuần tự
   ```bash
   npx playwright test --workers=1
   ```

2. **Chạy tests với retry**: Đặt RETRY_TIMES trong `.env`
   ```bash
   RETRY_TIMES=2 npx playwright test
   ```

3. **Giới hạn số workers**: Đặt NUMBER_OF_WORKERS trong `.env`
   ```bash
   NUMBER_OF_WORKERS=3 npx playwright test
   ```

4. **Tăng timeout**: Đặt TEST_TIMEOUT trong `.env` (đơn vị: milliseconds)
   ```bash
   TEST_TIMEOUT=60000 npx playwright test
   ```

## Lưu ý

- URL mặc định: `https://usagi.tcv-dev.com`
- Tất cả dependencies và versions đã đồng nhất với project `tcv_autotest`
- Node version yêu cầu: 20.14.0 (theo Dockerfile)
