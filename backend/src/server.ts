import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import productRoutes from './modules/product/product.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import { prisma, checkDbAvailability } from './lib/prisma.js';

const app = express();

// 1. Cấu hình CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-account-id'],
}));

// 2. Body Parser dung lượng cao
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 3. Phục vụ thư mục ảnh tĩnh /uploads
const uploadDir = path.resolve(process.cwd(), 'public/uploads');
app.use('/uploads', express.static(uploadDir));

// 4. Middleware đo thời gian phản hồi
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 5. Gắn Multi-tenant context (accountId)
app.use(tenantMiddleware);

// 6. Health check endpoint
const healthHandler = async (_req: express.Request, res: express.Response) => {
  const isDbReady = await checkDbAvailability();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isDbReady ? 'connected' : 'unavailable',
    pancakeConfigured: Boolean(env.PANCAKE_SHOP_ID && env.PANCAKE_API_TOKEN),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

import { resetMockProducts, clearMockProducts } from './modules/product/product.service.js';
import { resetMockOrders, clearMockOrders } from './modules/order/order.service.js';

// 7. Đăng ký API routes
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// Endpoint điều khiển dữ liệu mẫu để người dùng test chức năng
app.post('/api/mock/reset', (_req, res) => {
  resetMockProducts();
  resetMockOrders();
  res.json({ success: true, message: 'Đã nạp lại dữ liệu mẫu Cẩm Tuyền House thành công!' });
});

app.post('/api/mock/clear', (_req, res) => {
  clearMockProducts();
  clearMockOrders();
  res.json({ success: true, message: 'Đã xóa trắng dữ liệu test, sẵn sàng kéo từ POS thật!' });
});

// 8. Error handling middleware
app.use(errorHandler);

const PORT = Number(env.PORT) || 5000;
let server: import('node:http').Server | null = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 [Backend] Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📸 [Static Uploads] Phục vụ ảnh tại http://localhost:${PORT}/uploads`);
    console.log(`📦 [Pancake Shop ID]: ${env.PANCAKE_SHOP_ID ? env.PANCAKE_SHOP_ID : '(Chưa cấu hình)'}`);
  });
}

// 9. Graceful Shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang đóng kết nối an toàn...`);
  if (server) {
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('✅ Đã ngắt kết nối Database Prisma an toàn.');
        process.exit(0);
      } catch (err) {
        console.error('Lỗi khi đóng Database:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
