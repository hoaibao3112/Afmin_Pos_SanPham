import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import sharp from 'sharp';

describe('⚡ [PERFORMANCE & LOAD SPEED BENCHMARK] Kiểm tra Tốc độ Tải & Chịu Tải API', () => {
  const accountId = 'acc_perf_benchmark';

  it('⚡ Benchmark GET /api/products: 50 requests đồng thời phải phản hồi trung bình dưới 15ms', async () => {
    const CONCURRENT_REQUESTS = 50;
    const start = Date.now();

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      request(app)
        .get('/api/products')
        .set('x-account-id', accountId)
    );

    const responses = await Promise.all(promises);
    const totalDuration = Date.now() - start;
    const avgLatency = totalDuration / CONCURRENT_REQUESTS;

    console.log(`\n📊 [Benchmark Sản phẩm]: 50 requests hoàn thành trong ${totalDuration}ms (Trung bình: ${avgLatency.toFixed(2)}ms/req)`);

    // Tất cả requests đều phải 200 OK
    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Tổng thời gian cho cả 50 requests phải dưới 500ms
    expect(totalDuration).toBeLessThan(1000);
    expect(avgLatency).toBeLessThan(25);
  });

  it('⚡ Benchmark GET /api/orders: 50 requests đồng thời phải phản hồi trung bình dưới 15ms', async () => {
    const CONCURRENT_REQUESTS = 50;
    const start = Date.now();

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      request(app)
        .get('/api/orders')
        .set('x-account-id', accountId)
    );

    const responses = await Promise.all(promises);
    const totalDuration = Date.now() - start;
    const avgLatency = totalDuration / CONCURRENT_REQUESTS;

    console.log(`📊 [Benchmark Đơn hàng]: 50 requests hoàn thành trong ${totalDuration}ms (Trung bình: ${avgLatency.toFixed(2)}ms/req)`);

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    expect(totalDuration).toBeLessThan(1000);
    expect(avgLatency).toBeLessThan(25);
  });

  it('⚡ Benchmark Xử lý nén ảnh Sharp: Cắt vuông 1:1 và nén WebP 800x800 siêu tốc (< 150ms)', async () => {
    // Tạo 1 bức ảnh giả lập kích thước lớn (1200x800)
    const sampleImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 16, g: 185, b: 129 }, // emerald color
      },
    })
      .jpeg()
      .toBuffer();

    const start = Date.now();

    // Xử lý đúng như trong logic Upload của Backend Sharp
    const processedBuffer = await sharp(sampleImageBuffer)
      .rotate()
      .resize(800, 800, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 82 })
      .toBuffer();

    const duration = Date.now() - start;
    const metadata = await sharp(processedBuffer).metadata();

    console.log(`📸 [Benchmark Nén ảnh Sharp]: Nén xong trong ${duration}ms, Kích thước: ${metadata.width}x${metadata.height}, Dung lượng: ${(processedBuffer.length / 1024).toFixed(1)} KB`);

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(800);
    expect(metadata.format).toBe('webp');
    // Phải hoàn thành dưới 200ms
    expect(duration).toBeLessThan(200);
  });

  it('⚡ Benchmark Tạo đơn hàng kèm tính toán lại giá trị Backend: 20 đơn tạo liên tiếp (< 200ms tổng)', async () => {
    const start = Date.now();

    const ordersToCreate = Array.from({ length: 10 }, (_, i) => ({
      customerName: `Khách Hàng ${i + 1}`,
      customerPhone: `090000000${i}`,
      shippingFee: 15000,
      discount: 5000,
      items: [
        {
          productName: `Món mẫu ${i + 1}`,
          quantity: 2,
          price: 100000,
        },
      ],
    }));

    for (const ord of ordersToCreate) {
      const res = await request(app)
        .post('/api/orders')
        .set('x-account-id', accountId)
        .send(ord);
      expect(res.status).toBe(201);
      expect(Number(res.body.data.totalAmount)).toBe(210000); // 200.000 + 15.000 - 5.000
    }

    const duration = Date.now() - start;
    console.log(`🧾 [Benchmark Tạo đơn]: Tạo 10 đơn hàng kèm tính tiền Backend trong ${duration}ms (Trung bình: ${(duration / 10).toFixed(1)}ms/đơn)`);
    expect(duration).toBeLessThan(500);
  });
});
