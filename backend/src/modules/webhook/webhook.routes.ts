import { Router, Request, Response, NextFunction } from 'express';
import { ingestPancakeOrder } from '../order/order.service.js';

const router = Router();

/**
 * Webhook nhận sự kiện Đơn hàng mới / Cập nhật từ Pancake POS (Realtime)
 * Khi khách chốt đơn giỏ hàng trên Facebook Messenger -> Pancake bắn Webhook sang đây
 */
router.post('/pancake/order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    console.log('🔔 [Webhook Pancake POS] Nhận đơn hàng mới:', payload?.id || payload?.order_id || 'Unknown');

    // Hỗ trợ cả payload trực tiếp hoặc bọc trong payload.order / payload.data
    const orderData = payload.order || payload.data || payload;
    const ingested = await ingestPancakeOrder(orderData);

    res.json({
      success: true,
      message: 'Đã tiếp nhận và cập nhật đơn hàng thành công',
      orderId: ingested?.id,
      code: ingested?.code,
    });
  } catch (err) {
    console.error('❌ Lỗi xử lý Webhook Pancake:', err);
    next(err);
  }
});

export default router;
