import { prisma, checkDbAvailability } from '../../lib/prisma.js';
import { getAccountId } from '../../lib/context.js';
import { env } from '../../config/env.js';
import { CreateOrderInput, OrderQueryInput, UpdateOrderStatusInput } from './order.schema.js';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Tính toán an toàn lại toàn bộ giá trị đơn hàng trên Backend
 */
function calculateOrderTotals(
  items: Array<{ quantity: number; price: number }>,
  shippingFee = 0,
  discount = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalAmount = Math.max(0, subtotal + shippingFee - discount);
  return { subtotal, totalAmount };
}

// Bộ nhớ dự phòng In-Memory khi CSDL PostgreSQL chưa kết nối
let inMemoryOrders: any[] = [
  {
    id: 'ord_10023',
    accountId: 'acc_default',
    code: 'DH-10023',
    customerName: 'Nguyễn Thị Mai',
    customerPhone: '0918234567',
    customerAddress: '124 Đường 30/4, Phường 1, TX. Cai Lậy, Tiền Giang',
    customerNote: 'Giao buổi sáng giúp em, gọi trước khi giao',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'COD',
    subtotal: 510000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 510000,
    source: 'MESSENGER',
    pancakeOrderId: 'pos_ord_9821',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 'item_1',
        orderId: 'ord_10023',
        productName: 'Lạp Xưởng Tôm Cai Lậy (Loại 1)',
        productImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
        quantity: 2,
        price: 180000,
        total: 360000,
      },
      {
        id: 'item_2',
        orderId: 'ord_10023',
        productName: 'Hồng Mật Fuji Giòn Ngọt',
        productImage: 'https://images.unsplash.com/photo-1577003833174-0498b8577771?w=500&auto=format&fit=crop&q=80',
        quantity: 1,
        price: 150000,
        total: 150000,
      },
    ],
  },
  {
    id: 'ord_10022',
    accountId: 'acc_default',
    code: 'DH-10022',
    customerName: 'Trần Văn Hoàng',
    customerPhone: '0903888999',
    customerAddress: 'Ấp Bình Phú, Xã Bình Phú, Huyện Cai Lậy, Tiền Giang',
    customerNote: 'Đóng gói thùng xốp cẩn thận giúp shop',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'CHUYEN_KHOAN',
    subtotal: 280000,
    shippingFee: 20000,
    discount: 0,
    totalAmount: 300000,
    source: 'MESSENGER',
    pancakeOrderId: 'pos_ord_9820',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    items: [
      {
        id: 'item_3',
        orderId: 'ord_10022',
        productName: 'Sầu Riêng Ri6 Cơm Vàng Hạt Lép',
        productImage: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=500&auto=format&fit=crop&q=80',
        quantity: 1,
        price: 280000,
        total: 280000,
      },
    ],
  },
];

/**
 * Lấy danh sách đơn hàng (kèm bộ lọc trạng thái, tìm kiếm, thống kê)
 */
export async function listOrders(query: OrderQueryInput) {
  const accountId = getAccountId();
  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = { accountId };

    if (query.status && query.status !== 'ALL') {
      whereClause.status = query.status as OrderStatus;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      whereClause.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, orders, pendingCount, allOrders] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: { accountId, status: 'PENDING' },
      }),
      prisma.order.findMany({
        where: { accountId, status: { not: 'CANCELLED' } },
        select: { totalAmount: true },
      }),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      items: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        pendingOrders: pendingCount,
        totalRevenue,
      },
    };
  } catch (_e) {
    console.warn('⚠️ CSDL chưa kết nối, sử dụng bộ nhớ dự phòng In-memory cho Đơn hàng.');
    let filtered = inMemoryOrders.filter((o) => o.accountId === accountId || o.accountId === 'acc_default');

    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((o) => o.status === query.status);
    }

    if (query.search?.trim()) {
      const t = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.code.toLowerCase().includes(t) ||
          o.customerName.toLowerCase().includes(t) ||
          (o.customerPhone && o.customerPhone.includes(t))
      );
    }

    const pendingCount = inMemoryOrders.filter((o) => o.status === 'PENDING').length;
    const totalRevenue = inMemoryOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((s, o) => s + Number(o.totalAmount), 0);

    return {
      items: filtered,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: 1,
      },
      metrics: {
        pendingOrders: pendingCount,
        totalRevenue,
      },
    };
  }
}

/**
 * Lấy chi tiết một hóa đơn theo ID
 */
export async function getOrderById(id: string) {
  const accountId = getAccountId();

  try {
    const order = await prisma.order.findFirst({
      where: { id, accountId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (order) return order;
  } catch (_e) {}

  const mem = inMemoryOrders.find((o) => o.id === id);
  if (!mem) {
    throw new Error('Không tìm thấy đơn hàng / hóa đơn này');
  }

  return mem;
}

/**
 * Tạo mới đơn hàng (Chủ shop tạo trực tiếp hoặc qua giỏ hàng)
 */
export async function createOrder(data: CreateOrderInput) {
  const accountId = getAccountId();

  // Tái tính toán an toàn từ các item
  const { subtotal, totalAmount } = calculateOrderTotals(
    data.items,
    data.shippingFee,
    data.discount
  );

  const code = `DH-${Date.now().toString().slice(-6)}`;
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      await prisma.account.upsert({
        where: { id: accountId },
        update: {},
        create: { id: accountId, name: `Cửa hàng (${accountId})` },
      });

      const order = await prisma.order.create({
      data: {
        accountId,
        code,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        customerAddress: data.customerAddress || null,
        customerNote: data.customerNote || null,
        paymentMethod: data.paymentMethod || 'COD',
        shippingFee: data.shippingFee || 0,
        discount: data.discount || 0,
        subtotal,
        totalAmount,
        pancakeOrderId: data.pancakeOrderId || null,
        source: data.source || 'MESSENGER',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        items: {
          create: data.items.map((it) => ({
            productId: it.productId || null,
            productName: it.productName,
            productImage: it.productImage || null,
            quantity: it.quantity,
            price: it.price,
            total: it.quantity * it.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

      return order;
    } catch (_e) {
      // Fall through to in-memory fallback
    }
  }

  const newOrd = {
      id: `ord_${Date.now()}`,
      accountId,
      code,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      customerAddress: data.customerAddress || null,
      customerNote: data.customerNote || null,
      paymentMethod: data.paymentMethod || 'COD',
      shippingFee: data.shippingFee || 0,
      discount: data.discount || 0,
      subtotal,
      totalAmount,
      pancakeOrderId: data.pancakeOrderId || null,
      source: data.source || 'MESSENGER',
      status: 'PENDING' as OrderStatus,
      paymentStatus: 'UNPAID' as PaymentStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: data.items.map((it, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        orderId: `ord_${Date.now()}`,
        productName: it.productName,
        productImage: it.productImage || null,
        quantity: it.quantity,
        price: it.price,
        total: it.quantity * it.price,
      })),
    };
    inMemoryOrders.unshift(newOrd);
    return newOrd;
  }

/**
 * Cập nhật trạng thái đơn hàng (Duyệt, Giao, Hoàn thành, Hủy)
 */
export async function updateOrderStatus(id: string, data: UpdateOrderStatusInput) {
  const accountId = getAccountId();

  try {
    const existing = await prisma.order.findFirst({
      where: { id, accountId },
    });

    if (existing) {
      return await prisma.order.update({
        where: { id, accountId },
        data: {
          status: data.status,
          ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
        },
        include: {
          items: true,
        },
      });
    }
  } catch (_e) {}

  const mem = inMemoryOrders.find((o) => o.id === id);
  if (!mem) {
    throw new Error('Đơn hàng không tồn tại');
  }

  mem.status = data.status;
  if (data.paymentStatus) {
    mem.paymentStatus = data.paymentStatus;
  }
  mem.updatedAt = new Date().toISOString();
  return mem;
}

/**
 * Tiếp nhận đơn hàng từ Pancake POS (qua Webhook hoặc kéo API)
 * Xử lý IDEMPOTENCY: Nếu đơn đã có pancakeOrderId trong CSDL thì cập nhật chứ không sinh đơn trùng
 */
export async function ingestPancakeOrder(rawOrder: any) {
  const accountId = getAccountId();

  if (!rawOrder) return null;

  const pancakeOrderId = String(rawOrder.id || rawOrder.order_id || '');
  if (!pancakeOrderId) return null;

  // Lấy thông tin khách hàng
  const customerName =
    rawOrder.bill_full_name ||
    rawOrder.customer?.name ||
    rawOrder.shipping_address?.full_name ||
    'Khách hàng Messenger';
  const customerPhone =
    rawOrder.bill_phone_number ||
    rawOrder.customer?.phone_number ||
    rawOrder.shipping_address?.phone_number ||
    null;
  const customerAddress =
    rawOrder.shipping_address?.full_address ||
    rawOrder.shipping_address?.address ||
    rawOrder.customer?.address ||
    null;
  const customerNote = rawOrder.customer_note || rawOrder.note || null;

  // Lấy danh sách mặt hàng
  const rawItems = rawOrder.items || rawOrder.order_items || rawOrder.variations || [];
  const items = rawItems.map((item: any) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const price = Number(item.price || item.retail_price || 0);
    return {
      productName: item.product_name || item.name || 'Sản phẩm',
      productImage: item.avatar_url || item.image_url || null,
      quantity,
      price,
      total: quantity * price,
    };
  });

  const shippingFee = Number(rawOrder.shipping_fee || 0);
  const discount = Number(rawOrder.discount || 0);
  const { subtotal, totalAmount } = calculateOrderTotals(items, shippingFee, discount);

  const code = rawOrder.bill_code || `POS-${pancakeOrderId.slice(-6)}`;

  // Ánh xạ trạng thái
  let status: OrderStatus = 'PENDING';
  const rawStatus = String(rawOrder.status || '').toLowerCase();
  if (rawStatus.includes('confirm') || rawStatus.includes('xac_nhan')) {
    status = 'CONFIRMED';
  } else if (rawStatus.includes('shipping') || rawStatus.includes('dang_giao')) {
    status = 'SHIPPING';
  } else if (rawStatus.includes('complete') || rawStatus.includes('thanh_cong')) {
    status = 'COMPLETED';
  } else if (rawStatus.includes('cancel') || rawStatus.includes('huy')) {
    status = 'CANCELLED';
  }

  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      const existing = await prisma.order.findFirst({
        where: { pancakeOrderId, accountId },
        include: { items: true },
      });

      if (existing) {
        return await prisma.order.update({
          where: { id: existing.id },
          data: {
            status,
            customerName,
            customerPhone,
            customerAddress,
            customerNote,
            shippingFee,
            discount,
            subtotal,
            totalAmount,
          },
          include: { items: true },
        });
      }

      return await prisma.order.create({
        data: {
          accountId,
          code,
          pancakeOrderId,
          customerName,
          customerPhone,
          customerAddress,
          customerNote,
          source: 'MESSENGER_POS',
          status,
          paymentStatus: rawOrder.is_paid ? 'PAID' : 'UNPAID',
          paymentMethod: 'COD',
          shippingFee,
          discount,
          subtotal,
          totalAmount,
          items: {
            create: items.map((it: any) => ({
              productName: it.productName,
              productImage: it.productImage,
              quantity: it.quantity,
              price: it.price,
              total: it.total,
            })),
          },
        },
        include: { items: true },
      });
    } catch (_e) {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const existingMem = inMemoryOrders.find(
    (o) => o.pancakeOrderId === pancakeOrderId && o.accountId === accountId
  );

  if (existingMem) {
    existingMem.status = status;
    existingMem.customerName = customerName;
    existingMem.customerPhone = customerPhone;
    existingMem.customerAddress = customerAddress;
    existingMem.customerNote = customerNote;
    existingMem.totalAmount = totalAmount;
    existingMem.updatedAt = new Date().toISOString();
    return existingMem;
  }

  const newMemOrder = {
    id: `ord_pos_${Date.now()}`,
    accountId,
    code,
    pancakeOrderId,
    customerName,
    customerPhone,
    customerAddress,
    customerNote,
    source: 'MESSENGER_POS',
    status,
    paymentStatus: rawOrder.is_paid ? 'PAID' : 'UNPAID',
    paymentMethod: 'COD',
    shippingFee,
    discount,
    subtotal,
    totalAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: items.map((it: any, idx: number) => ({
      id: `item_pos_${Date.now()}_${idx}`,
      orderId: `ord_pos_${Date.now()}`,
      productName: it.productName,
      productImage: it.productImage,
      quantity: it.quantity,
      price: it.price,
      total: it.total,
    })),
  };
  inMemoryOrders.unshift(newMemOrder);
  return newMemOrder;
}

/**
 * Kéo đơn hàng mới nhất trực tiếp từ Pancake POS API
 */
export async function syncOrdersFromPancake() {
  const shopId = env.PANCAKE_SHOP_ID;
  const token = env.PANCAKE_API_TOKEN;

  if (!shopId || !token) {
    throw new Error('Chưa cấu hình PANCAKE_SHOP_ID hoặc PANCAKE_API_TOKEN trong .env');
  }

  const url = `https://pos.pancake.vn/api/v1/shops/${shopId}/orders?api_key=${token}&page_size=30`;

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối Pancake POS: ${response.statusText}`);
  }

  const result = (await response.json()) as any;
  const rawOrders = result.data || result.orders || [];

  let syncedCount = 0;
  for (const raw of rawOrders) {
    try {
      await ingestPancakeOrder(raw);
      syncedCount++;
    } catch (e) {
      console.warn('⚠️ Lỗi khi nạp đơn từ Pancake:', e);
    }
  }

  return {
    success: true,
    totalFetched: rawOrders.length,
    syncedCount,
    message: `Đã đồng bộ thành công ${syncedCount} đơn hàng từ Pancake POS`,
  };
}
