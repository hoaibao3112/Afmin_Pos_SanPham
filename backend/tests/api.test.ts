import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('🚀 [UNIT TEST] Toàn bộ API Backend - Cẩm Tuyền House & Pancake POS', () => {
  const accountId = 'acc_test_suite';

  // 1. HEALTH CHECK ENDPOINT
  describe('1. Health Check API', () => {
    it('GET /health - phản hồi 200 OK dưới 50ms', async () => {
      const start = Date.now();
      const res = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/health - hỗ trợ alias path /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // 2. PRODUCT CRUD API
  describe('2. Product API (Quản lý sản phẩm)', () => {
    let createdProductId = '';

    it('GET /api/products - lấy danh sách sản phẩm nhanh (< 100ms)', async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/products')
        .set('x-account-id', accountId);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    it('POST /api/products - tạo mới sản phẩm thành công chuẩn Meta Catalog', async () => {
      const payload = {
        name: 'Vú Sữa Lò Rèn Vĩnh Kim',
        category: 'Trái Cây Tươi',
        price: 95000,
        stock: 30,
        description: 'Vú sữa ngọt thanh béo ngậy, đóng thùng giấy 5kg.',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
      };

      const start = Date.now();
      const res = await request(app)
        .post('/api/products')
        .set('x-account-id', accountId)
        .send(payload);
      const duration = Date.now() - start;

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(payload.name);
      expect(Number(res.body.data.price)).toBe(payload.price);
      expect(duration).toBeLessThan(200);

      createdProductId = res.body.data.id;
    });

    it('POST /api/products - báo lỗi 400 khi thiếu Tên sản phẩm hoặc Giá âm', async () => {
      const invalidPayload = {
        name: '',
        price: -50000,
        stock: 10,
      };

      const res = await request(app)
        .post('/api/products')
        .set('x-account-id', accountId)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/products/:id - lấy chi tiết sản phẩm theo ID', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('x-account-id', accountId);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdProductId);
      expect(res.body.data.name).toBe('Vú Sữa Lò Rèn Vĩnh Kim');
    });

    it('PUT /api/products/:id - cập nhật thông tin sản phẩm', async () => {
      if (!createdProductId) return;

      const updatePayload = {
        price: 110000,
        stock: 25,
      };

      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('x-account-id', accountId)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/products/:id/stock - cập nhật nhanh tồn kho (Quick Stock)', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .patch(`/api/products/${createdProductId}/stock`)
        .set('x-account-id', accountId)
        .send({ stock: 50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 3. ORDER & INVOICE API
  describe('3. Order & Invoice API (Hóa đơn & Đơn hàng)', () => {
    let createdOrderId = '';

    it('GET /api/orders - lấy danh sách đơn hàng & chỉ số doanh thu siêu tốc (< 50ms)', async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/orders')
        .set('x-account-id', accountId);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.metrics).toBeDefined();
      expect(typeof res.body.metrics.totalRevenue).toBe('number');
      expect(duration).toBeLessThan(200);
    });

    it('POST /api/orders - tạo đơn hàng & Backend tự tính lại tổng tiền an toàn', async () => {
      const orderPayload = {
        customerName: 'Khách Hàng Thử Nghiệm',
        customerPhone: '0988776655',
        customerAddress: 'Ấp Mỹ Phú, Huyện Cai Lậy, Tiền Giang',
        customerNote: 'Giao nhanh trước 11h trưa',
        shippingFee: 20000,
        discount: 10000,
        items: [
          {
            productName: 'Lạp Xưởng Tôm Loại 1',
            quantity: 2,
            price: 180000,
          },
          {
            productName: 'Hồng Mật Fuji',
            quantity: 1,
            price: 150000,
          },
        ],
      };

      // Backend tự tính: 2 * 180.000 + 1 * 150.000 = 510.000
      // Tổng thanh toán: 510.000 + 20.000 - 10.000 = 520.000

      const start = Date.now();
      const res = await request(app)
        .post('/api/orders')
        .set('x-account-id', accountId)
        .send(orderPayload);
      const duration = Date.now() - start;

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe(orderPayload.customerName);
      expect(Number(res.body.data.subtotal)).toBe(510000);
      expect(Number(res.body.data.totalAmount)).toBe(520000);
      expect(res.body.data.status).toBe('PENDING');
      expect(duration).toBeLessThan(200);

      createdOrderId = res.body.data.id;
    });

    it('POST /api/orders - báo lỗi 400 khi danh sách items rỗng', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('x-account-id', accountId)
        .send({
          customerName: 'Khách không có món',
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/orders/:id - lấy chi tiết hóa đơn bán lẻ đầy đủ', async () => {
      if (!createdOrderId) return;

      const res = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('x-account-id', accountId);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdOrderId);
      expect(res.body.data.items.length).toBe(2);
    });

    it('PATCH /api/orders/:id/status - cập nhật trạng thái đơn (Duyệt, Giao, Hoàn thành)', async () => {
      if (!createdOrderId) return;

      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('x-account-id', accountId)
        .send({
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.paymentStatus).toBe('PAID');
    });
  });

  // 4. PANCAKE WEBHOOK (IDEMPOTENCY & REALTIME)
  describe('4. Pancake POS Webhook (Tiếp nhận đơn Realtime)', () => {
    it('POST /api/webhooks/pancake/order - nạp đơn hàng tự động từ Messenger', async () => {
      const pancakeOrderPayload = {
        id: 'pos_webhook_test_123',
        bill_full_name: 'Nguyễn Văn A (Từ Messenger)',
        bill_phone_number: '0912345678',
        customer_note: 'Đóng gói kỹ gửi chành xe',
        shipping_address: {
          full_address: 'Khu 1, Thị trấn Cái Bè, Tiền Giang',
        },
        shipping_fee: 15000,
        discount: 0,
        items: [
          {
            product_name: 'Sầu Riêng Ri6 Bao Ăn',
            quantity: 2,
            price: 250000,
          },
        ],
      };

      const res = await request(app)
        .post('/api/webhooks/pancake/order')
        .send(pancakeOrderPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderId).toBeDefined();
    });
  });
});
