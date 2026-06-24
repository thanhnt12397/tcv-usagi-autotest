// File này chỉ để trigger globalSetup trong setup-auth.ts
// Không có test nào ở đây
import { test } from '@playwright/test';

test('Setup authentication', async () => {
  // Test này sẽ không chạy vì globalSetup đã hoàn thành
  // Nếu đã có auth state, test này sẽ pass ngay
  // Nếu chưa có, globalSetup sẽ mở browser để đăng nhập
});
