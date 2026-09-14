import { Router, Request, Response, NextFunction } from 'express';
import { ingestPancakeOrder } from '../order/order.service.js';
import { configurePancakeWebhook, getPancakeShopInfo } from '../pancake/pancake.service.js';
import { env } from '../../config/env.js';

const router = Router();

/**
 * Xử lý webhook chung từ Pancake POS theo chuẩn OpenAPI 3.1
 * Hỗ trợ các loại webhook_types: orders, products, variations_warehouses
 * Docs: https://docs.pancake.biz/pos/api/#tag/webhook/put/shopsshop_id
 */
async function handlePancakeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    console.log('🔔 [Webhook Pancake POS] Nhận sự kiện realtime:', JSON.stringify(payload).slice(0, 250));

    // 1. Kiểm tra nếu là Webhook Đơn Hàng (orders)
    // Pancake WebhookOrderResponse: có id, system_id, shop_id, bill_full_name, items,...
    if (payload?.id || payload?.order_id || payload?.bill_full_name || payload?.order || (payload?.data && !payload?.data?.record)) {
      const orderData = payload.order || payload.data || payload;
      const ingested = await ingestPancakeOrder(orderData);
      return res.json({
        success: true,
        type: 'order',
        message: 'Đã tiếp nhận và cập nhật đơn hàng thành công',
        orderId: ingested?.id,
        code: ingested?.code,
      });
    }

    // 2. Kiểm tra nếu là Webhook Tồn Kho Biến Thể (variations_warehouses)
    // Pancake WebhookInventoryResponse: { data: { record: { variation_id, warehouse_id, remain_quantity } } }
    if (payload?.data?.record?.variation_id && payload?.data?.record?.remain_quantity !== undefined) {
      const { variation_id, warehouse_id, remain_quantity } = payload.data.record;
      console.log(`📦 [Webhook Pancake POS] Cập nhật tồn kho biến thể: ${variation_id}, kho: ${warehouse_id}, còn: ${remain_quantity}`);
      return res.json({
        success: true,
        type: 'variations_warehouses',
        message: 'Đã nhận sự kiện cập nhật tồn kho biến thể',
        variationId: variation_id,
        remainQuantity: remain_quantity,
      });
    }

    // 3. Kiểm tra nếu là Webhook Sản Phẩm (products)
    // Pancake WebhookProductResponse: { data: { record: Product, success: true } }
    if (payload?.data?.record && (payload?.data?.record?.name || payload?.data?.record?.sku)) {
      console.log(`🏷️ [Webhook Pancake POS] Cập nhật sản phẩm: ${payload.data.record.name}`);
      return res.json({
        success: true,
        type: 'product',
        message: 'Đã nhận sự kiện cập nhật sản phẩm',
        productId: payload.data.record.id,
      });
    }

    // Mặc định phản hồi HTTP 200 để Pancake không bị timeout hoặc retry liên tục
    return res.json({
      success: true,
      message: 'Đã tiếp nhận webhook từ Pancake POS',
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ Lỗi xử lý Webhook Pancake:', err);
    next(err);
  }
}

// Endpoint chính thức theo đường dẫn webhook chuẩn
router.post('/pancake', handlePancakeWebhook);

// Endpoint tương thích ngược
router.post('/pancake/order', handlePancakeWebhook);

/**
 * Lấy thông tin cấu hình webhook hiện tại
 */
router.get('/pancake/info', async (_req: Request, res: Response) => {
  const shopInfo = await getPancakeShopInfo();
  res.json({
    configured: Boolean(env.PANCAKE_SHOP_ID && env.PANCAKE_API_TOKEN),
    shopId: env.PANCAKE_SHOP_ID,
    warehouseId: env.PANCAKE_WAREHOUSE_ID,
    tokenMasked: env.PANCAKE_API_TOKEN ? `${env.PANCAKE_API_TOKEN.slice(0, 6)}...${env.PANCAKE_API_TOKEN.slice(-4)}` : '',
    webhookEndpoints: {
      standard: '/api/webhooks/pancake',
      orderOnly: '/api/webhooks/pancake/order',
    },
    shopDetails: shopInfo,
  });
});

/**
 * Gọi API cấu hình Webhook từ xa sang Pancake POS (PUT /shops/{SHOP_ID})
 */
router.post('/pancake/configure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webhookUrl, webhookEmail, webhookTypes, apiKeyHeader } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Thiếu tham số webhookUrl' });
    }

    const result = await configurePancakeWebhook({
      webhookUrl,
      webhookEmail,
      webhookTypes,
      apiKeyHeader,
    });

    res.json({
      success: true,
      message: 'Đã thiết lập Webhook tự động sang Pancake POS thành công!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Endpoint giả lập bắn thử Webhook đơn hàng để test giao diện
 */
router.post('/pancake/test-simulate', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const mockOrderPayload = {
      id: Math.floor(10000000 + Math.random() * 90000000),
      bill_full_name: 'Khách Test Webhook POS',
      bill_phone_number: '0909' + Math.floor(100000 + Math.random() * 900000),
      status: 'new',
      items: [
        {
          name: 'Khoai lang mật tươi sạch (Test Webhook)',
          price: 50000,
          quantity: 3,
        },
      ],
      shipping_address: {
        address: '123 Đường 30/4, Cai Lậy, Tiền Giang',
      },
    };

    const ingested = await ingestPancakeOrder(mockOrderPayload);
    res.json({
      success: true,
      message: 'Đã giả lập gửi Webhook đơn hàng Pancake POS thành công!',
      order: ingested,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
