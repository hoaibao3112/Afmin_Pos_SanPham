import { env } from '../../config/env.js';

export interface SyncProductToPancakeInput {
  name: string;
  sku?: string;
  category?: string;
  price: number;
  costPrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
}

export interface PancakeSyncResult {
  pancakeProductId: string;
  pancakeVariationId: string;
}

/**
 * Hàm gọi API với cơ chế Retry & Timeout an toàn (Circuit Breaker pattern)
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 2, timeoutMs = 8000): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok || i === retries) return res;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (i === retries) throw err;
      // Chờ tăng dần theo lũy thừa: 500ms, 1000ms
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error('Đã thử gọi API Pancake POS nhiều lần nhưng không thành công');
}

/**
 * Đẩy tạo sản phẩm mới sang Pancake POS
 */
export async function pushProductToPancake(product: SyncProductToPancakeInput): Promise<PancakeSyncResult> {
  const shopId = env.PANCAKE_SHOP_ID;
  const token = env.PANCAKE_API_TOKEN;
  const warehouseId = env.PANCAKE_WAREHOUSE_ID;

  if (!shopId || !token) {
    throw new Error('Chưa cấu hình PANCAKE_SHOP_ID hoặc PANCAKE_API_TOKEN trong file .env');
  }

  const endpoint = `https://pos.pancake.vn/api/v1/shops/${shopId}/products`;
  const sku = product.sku || `CTH-${Date.now().toString().slice(-6)}`;

  // Chỉ gửi mảng ảnh nếu là URL trực tuyến (http/https), nếu là base64 thì lưu cục bộ
  const validImages: string[] = [];
  if (product.imageUrl && (product.imageUrl.startsWith('http://') || product.imageUrl.startsWith('https://'))) {
    validImages.push(product.imageUrl);
  }

  const payload = {
    product: {
      name: product.name,
      description: product.description || product.name,
      images: validImages,
      category_name: product.category || 'Mặc định',
      variations: [
        {
          sku: sku,
          retail_price: product.price,
          original_price: product.costPrice || product.price,
          warehouse_stocks: warehouseId
            ? [
                {
                  warehouse_id: Number(warehouseId),
                  quantity: product.stock,
                },
              ]
            : [],
        },
      ],
    },
  };

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData = (await response.json()) as any;

  if (!response.ok) {
    const errorDetail = responseData?.message || JSON.stringify(responseData);
    throw new Error(`Pancake POS API Error: ${errorDetail}`);
  }

  const pancakeProductId = responseData?.product?.id?.toString() || '';
  const pancakeVariationId = responseData?.product?.variations?.[0]?.id?.toString() || '';

  return {
    pancakeProductId,
    pancakeVariationId,
  };
}

/**
 * Cập nhật thông tin / giá / tồn kho của sản phẩm đã liên kết trên Pancake POS
 */
export async function updateProductOnPancake(
  pancakeProductId: string,
  pancakeVariationId: string | undefined,
  product: Partial<SyncProductToPancakeInput>
): Promise<boolean> {
  const shopId = env.PANCAKE_SHOP_ID;
  const token = env.PANCAKE_API_TOKEN;
  const warehouseId = env.PANCAKE_WAREHOUSE_ID;

  if (!shopId || !token || !pancakeProductId) {
    return false;
  }

  try {
    const endpoint = `https://pos.pancake.vn/api/v1/shops/${shopId}/products/${pancakeProductId}`;

    const payload: Record<string, any> = {
      product: {
        ...(product.name && { name: product.name }),
        ...(product.description !== undefined && { description: product.description }),
      },
    };

    // Nếu có biến thể & giá/kho cập nhật
    if (pancakeVariationId && (product.price !== undefined || product.stock !== undefined)) {
      payload.product.variations = [
        {
          id: pancakeVariationId,
          ...(product.price !== undefined && { retail_price: product.price }),
          ...(product.stock !== undefined && warehouseId && {
            warehouse_stocks: [
              {
                warehouse_id: Number(warehouseId),
                quantity: product.stock,
              },
            ],
          }),
        },
      ];
    }

    const response = await fetchWithRetry(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (err) {
    console.warn('⚠️ Lỗi cập nhật sang Pancake POS:', err);
    return false;
  }
}
