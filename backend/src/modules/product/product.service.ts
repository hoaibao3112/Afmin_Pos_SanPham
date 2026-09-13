import { prisma } from '../../lib/prisma.js';
import { getAccountId } from '../../lib/context.js';
import { CreateProductInput, UpdateProductInput } from './product.schema.js';
import { pushProductToPancake, updateProductOnPancake } from '../pancake/pancake.service.js';

/**
 * Lấy danh sách sản phẩm theo accountId (Multi-tenant)
 */
export async function listProducts() {
  const accountId = getAccountId();

  try {
    return await prisma.product.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ Lỗi kết nối CSDL hoặc bảng chưa khởi tạo:', errorMsg);
    throw new Error(`Không thể kết nối CSDL: ${errorMsg}`);
  }
}

/**
 * Lấy chi tiết 1 sản phẩm
 */
export async function getProductById(id: string) {
  const accountId = getAccountId();

  const product = await prisma.product.findFirst({
    where: { id, accountId },
  });

  if (!product) {
    throw new Error('Sản phẩm không tồn tại');
  }

  return product;
}

/**
 * Tạo mới sản phẩm & tự động đồng bộ sang Pancake POS
 */
export async function createProduct(data: CreateProductInput) {
  const accountId = getAccountId();
  const sku = `CTH-${Date.now().toString().slice(-6)}`;

  // Đảm bảo Account đã có trong hệ thống
  try {
    await prisma.account.upsert({
      where: { id: accountId },
      update: {},
      create: { id: accountId, name: `Cửa hàng (${accountId})` },
    });
  } catch (_err) {
    // Bỏ qua nếu đã tồn tại
  }

  // 1. Lưu sản phẩm vào Database của Web
  const newProduct = await prisma.product.create({
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

  const existing = await prisma.product.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new Error('Không tìm thấy sản phẩm cần cập nhật');
  }

  // Cập nhật CSDL
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

  // Nếu sản phẩm đã từng liên kết với Pancake POS -> Cập nhật sang Pancake luôn!
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

/**
 * Cập nhật nhanh tồn kho (Quick Stock Update)
 */
export async function updateStock(id: string, stock: number) {
  const accountId = getAccountId();

  const existing = await prisma.product.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new Error('Không tìm thấy sản phẩm');
  }

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

/**
 * Đồng bộ lại thủ công 1 sản phẩm sang Pancake POS (Manual Re-sync)
 */
export async function syncProductToPancake(id: string) {
  const accountId = getAccountId();

  const product = await prisma.product.findFirst({
    where: { id, accountId },
  });

  if (!product) {
    throw new Error('Không tìm thấy sản phẩm');
  }

  const result = await pushProductToPancake({
    name: product.name,
    sku: product.sku || `CTH-${Date.now().toString().slice(-6)}`,
    category: product.category,
    price: Number(product.price),
    stock: product.stock,
    imageUrl: product.imageUrl || undefined,
    description: product.description || undefined,
  });

  return await prisma.product.update({
    where: { id, accountId },
    data: {
      pancakeProductId: result.pancakeProductId,
      pancakeVariationId: result.pancakeVariationId,
      isSyncedToPos: true,
    },
  });
}

/**
 * Xóa sản phẩm
 */
export async function deleteProduct(id: string) {
  const accountId = getAccountId();

  const existing = await prisma.product.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new Error('Không tìm thấy sản phẩm cần xóa');
  }

  await prisma.product.delete({
    where: { id, accountId },
  });

  return { success: true, message: 'Đã xóa sản phẩm thành công' };
}
