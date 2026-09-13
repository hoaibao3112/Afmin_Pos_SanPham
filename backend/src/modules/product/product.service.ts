import { prisma, checkDbAvailability } from '../../lib/prisma.js';
import { getAccountId } from '../../lib/context.js';
import { CreateProductInput, UpdateProductInput } from './product.schema.js';
import { pushProductToPancake, updateProductOnPancake } from '../pancake/pancake.service.js';

// Bộ nhớ dự phòng In-Memory khi CSDL PostgreSQL chưa khởi động
let inMemoryProducts: any[] = [
  {
    id: 'prod_lapxương',
    accountId: 'acc_default',
    name: 'Lạp Xưởng Tôm Cai Lậy (Loại 1)',
    category: 'Lạp Xưởng Cai Lậy',
    description: 'Đặc sản Cai Lậy gia truyền, thơm ngon đậm đà, hút chân không túi 500g tiện lợi.',
    price: '180000',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    sku: 'CTH-001',
    isSyncedToPos: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_hongmat',
    accountId: 'acc_default',
    name: 'Hồng Mật Fuji Giòn Ngọt',
    category: 'Trái Cây Tươi',
    description: 'Trái cây nhập khẩu chuẩn giòn ngọt thanh, đóng khay 1kg chọn lọc.',
    price: '150000',
    stock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1577003833174-0498b8577771?w=500&auto=format&fit=crop&q=80',
    sku: 'CTH-002',
    isSyncedToPos: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_saurieng',
    accountId: 'acc_default',
    name: 'Sầu Riêng Ri6 Cơm Vàng Hạt Lép',
    category: 'Trái Cây Tươi',
    description: 'Đặc sản miệt vườn Cai Lậy, cơm vàng dẻo béo, thơm nức mũi.',
    price: '280000',
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=500&auto=format&fit=crop&q=80',
    sku: 'CTH-003',
    isSyncedToPos: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Lấy danh sách sản phẩm theo accountId (Multi-tenant)
 */
export async function listProducts() {
  const accountId = getAccountId();
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      return await prisma.product.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (_err) {}
  }

  return inMemoryProducts.filter((p) => p.accountId === accountId || p.accountId === 'acc_default');
}

/**
 * Lấy chi tiết 1 sản phẩm
 */
export async function getProductById(id: string) {
  const accountId = getAccountId();
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      const product = await prisma.product.findFirst({
        where: { id, accountId },
      });
      if (product) return product;
    } catch (_e) {}
  }

  const mem = inMemoryProducts.find((p) => p.id === id);
  if (!mem) throw new Error('Sản phẩm không tồn tại');
  return mem;
}

/**
 * Tạo mới sản phẩm & tự động đồng bộ sang Pancake POS
 */
export async function createProduct(data: CreateProductInput) {
  const accountId = getAccountId();
  const sku = `CTH-${Date.now().toString().slice(-6)}`;
  const isDbReady = await checkDbAvailability();

  let newProduct: any;

  if (isDbReady) {
    try {
      await prisma.account.upsert({
        where: { id: accountId },
        update: {},
        create: { id: accountId, name: `Cửa hàng (${accountId})` },
      });

      newProduct = await prisma.product.create({
        data: {
          accountId,
          name: data.name,
          category: data.category || 'Mặc định',
          description: data.description || null,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl || null,
          sku,
          isSyncedToPos: false,
        },
      });
    } catch (_err) {}
  }

  if (!newProduct) {
    newProduct = {
      id: `prod_${Date.now()}`,
      accountId,
      name: data.name,
      category: data.category || 'Mặc định',
      description: data.description || null,
      price: String(data.price),
      stock: data.stock,
      imageUrl: data.imageUrl || null,
      sku,
      isSyncedToPos: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryProducts.unshift(newProduct);
  }

  // 2. Tự động gọi API đẩy sang Pancake POS (Không làm gián đoạn nếu mạng lỗi)
  try {
    const pancakeResult = await pushProductToPancake({
      name: data.name,
      sku,
      category: data.category,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
      description: data.description,
    });

    // 3. Cập nhật mã liên kết nếu thành công
    const updated = await prisma.product.update({
      where: { id: newProduct.id, accountId },
      data: {
        pancakeProductId: pancakeResult.pancakeProductId,
        pancakeVariationId: pancakeResult.pancakeVariationId,
        isSyncedToPos: true,
      },
    });

    return updated;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Chưa cấu hình Pancake Token';
    console.warn('⚠️ Chưa đồng bộ Pancake POS:', errorMsg);
    return newProduct;
  }
}

/**
 * Cập nhật sản phẩm & tự động đồng bộ thay đổi sang Pancake POS
 */
export async function updateProduct(id: string, data: UpdateProductInput) {
  const accountId = getAccountId();
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, accountId },
      });

      if (existing) {
        const updatedProduct = await prisma.product.update({
          where: { id, accountId },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.category !== undefined && { category: data.category }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.price !== undefined && { price: data.price }),
            ...(data.stock !== undefined && { stock: data.stock }),
            ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          },
        });

        if (existing.pancakeProductId) {
          try {
            await updateProductOnPancake(
              existing.pancakeProductId,
              existing.pancakeVariationId || undefined,
              {
                name: data.name,
                description: data.description,
                price: data.price,
                stock: data.stock,
              }
            );
          } catch (err) {
            console.warn('⚠️ Cập nhật sang Pancake POS thất bại:', err);
          }
        }

        return updatedProduct;
      }
    } catch (_e) {}
  }

  // In-memory fallback
  const mem = inMemoryProducts.find((p) => p.id === id);
  if (!mem) {
    throw new Error('Không tìm thấy sản phẩm cần cập nhật');
  }

  if (data.name !== undefined) mem.name = data.name;
  if (data.category !== undefined) mem.category = data.category;
  if (data.description !== undefined) mem.description = data.description;
  if (data.price !== undefined) mem.price = String(data.price);
  if (data.stock !== undefined) mem.stock = data.stock;
  if (data.imageUrl !== undefined) mem.imageUrl = data.imageUrl;
  mem.updatedAt = new Date().toISOString();

  return mem;
}

/**
 * Cập nhật nhanh tồn kho (Quick Stock Update)
 */
export async function updateStock(id: string, stock: number) {
  const accountId = getAccountId();
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, accountId },
      });

      if (existing) {
        const updatedProduct = await prisma.product.update({
          where: { id, accountId },
          data: { stock: Math.max(0, stock) },
        });

        if (existing.pancakeProductId) {
          await updateProductOnPancake(
            existing.pancakeProductId,
            existing.pancakeVariationId || undefined,
            { stock: Math.max(0, stock) }
          );
        }

        return updatedProduct;
      }
    } catch (_e) {}
  }

  // In-memory fallback
  const mem = inMemoryProducts.find((p) => p.id === id);
  if (!mem) {
    throw new Error('Không tìm thấy sản phẩm');
  }

  mem.stock = Math.max(0, stock);
  mem.updatedAt = new Date().toISOString();
  return mem;
}

/**
 * Đồng bộ lại thủ công 1 sản phẩm sang Pancake POS (Manual Re-sync)
 */
export async function syncProductToPancake(id: string) {
  const accountId = getAccountId();

  const product = await getProductById(id);

  const result = await pushProductToPancake({
    name: product.name,
    sku: product.sku || `CTH-${Date.now().toString().slice(-6)}`,
    category: product.category,
    price: Number(product.price),
    stock: product.stock,
    imageUrl: product.imageUrl || undefined,
    description: product.description || undefined,
  });

  const isDbReady = await checkDbAvailability();
  if (isDbReady) {
    try {
      return await prisma.product.update({
        where: { id, accountId },
        data: {
          pancakeProductId: result.pancakeProductId,
          pancakeVariationId: result.pancakeVariationId,
          isSyncedToPos: true,
        },
      });
    } catch (_e) {}
  }

  product.pancakeProductId = result.pancakeProductId;
  product.pancakeVariationId = result.pancakeVariationId;
  product.isSyncedToPos = true;
  return product;
}

/**
 * Xóa sản phẩm
 */
export async function deleteProduct(id: string) {
  const accountId = getAccountId();
  const isDbReady = await checkDbAvailability();

  if (isDbReady) {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, accountId },
      });

      if (existing) {
        await prisma.product.delete({
          where: { id, accountId },
        });
        return { success: true, message: 'Đã xóa sản phẩm thành công' };
      }
    } catch (_e) {}
  }

  const idx = inMemoryProducts.findIndex((p) => p.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy sản phẩm cần xóa');
  }

  await prisma.product.delete({
    where: { id, accountId },
  });

  return { success: true, message: 'Đã xóa sản phẩm thành công' };
}
