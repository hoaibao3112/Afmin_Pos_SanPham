import { prisma, checkDbAvailability } from '../../lib/prisma.js';
import { getAccountId } from '../../lib/context.js';
import { CreateProductInput, UpdateProductInput } from './product.schema.js';
import { pushProductToPancake, updateProductOnPancake, pullProductsFromPancake } from '../pancake/pancake.service.js';
import { MOCK_PRODUCTS } from '../../data/mock-data.js';

// Danh sách sản phẩm khởi tạo từ file mock data để test chức năng trước khi có key POS
let inMemoryProducts: any[] = [...MOCK_PRODUCTS];

export function resetMockProducts() {
  inMemoryProducts = [...MOCK_PRODUCTS];
  return inMemoryProducts;
}

export function clearMockProducts() {
  inMemoryProducts = [];
  return inMemoryProducts;
}

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

  inMemoryProducts.splice(idx, 1);
  return { success: true, message: 'Đã xóa sản phẩm thành công' };
}

/**
 * Đọc (kéo) danh sách sản phẩm từ Pancake POS và lưu vào hệ thống
 */
export async function syncProductsFromPancake() {
  const accountId = getAccountId();
  const rawProducts = await pullProductsFromPancake();

  const isDbReady = await checkDbAvailability();
  let syncedCount = 0;

  for (const raw of rawProducts) {
    try {
      const baseName = raw.name || raw.title || 'Sản phẩm Pancake';
      const description = raw.description || '';
      const category = raw.category_name || raw.category?.name || 'Mặc định';
      const variations = (raw.variations && raw.variations.length > 0) ? raw.variations : [{}];

      for (const v of variations) {
        const varName = v.name || v.title || '';
        const name = varName && varName !== baseName ? `${baseName} - ${varName}` : baseName;
        const price = Number(v.retail_price ?? raw.retail_price ?? raw.price ?? 0);
        const stock = Number(v.remain_quantity ?? v.stock ?? raw.stock ?? 10);
        const sku = v.sku || v.display_id || raw.display_id || raw.sku || `POS-${raw.id}${v.id ? `-${v.id}` : ''}`;
        const pancakeProductId = String(raw.id || '');
        const pancakeVariationId = String(v.id || '');
        const imageUrl = (v.images && v.images[0]) || raw.images?.[0] || null;

        if (isDbReady) {
          try {
            const existing = await prisma.product.findFirst({
              where: {
                accountId,
                OR: [{ pancakeVariationId }, { sku }],
              },
            });

            if (existing) {
              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  name,
                  category,
                  description,
                  price,
                  stock,
                  imageUrl: imageUrl || existing.imageUrl,
                  pancakeProductId,
                  pancakeVariationId,
                  isSyncedToPos: true,
                },
              });
            } else {
              await prisma.product.create({
                data: {
                  accountId,
                  name,
                  category,
                  description,
                  price,
                  stock,
                  sku,
                  imageUrl,
                  pancakeProductId,
                  pancakeVariationId,
                  isSyncedToPos: true,
                },
              });
            }
            syncedCount++;
            continue;
          } catch (_dbErr) {}
        }

        // In-memory fallback
        const existingMem = inMemoryProducts.find(
          (p) => p.accountId === accountId && ((pancakeVariationId && p.pancakeVariationId === pancakeVariationId) || p.sku === sku)
        );

        if (existingMem) {
          existingMem.name = name;
          existingMem.category = category;
          existingMem.description = description;
          existingMem.price = price;
          existingMem.stock = stock;
          if (imageUrl) existingMem.imageUrl = imageUrl;
          existingMem.isSyncedToPos = true;
          existingMem.updatedAt = new Date().toISOString();
        } else {
          inMemoryProducts.unshift({
            id: `prod_pos_${pancakeVariationId || pancakeProductId || Date.now()}`,
            accountId,
            name,
            category,
            description,
            price,
            stock,
            sku,
            imageUrl,
            pancakeProductId,
            pancakeVariationId,
            isSyncedToPos: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        syncedCount++;
      }
    } catch (itemErr) {
      console.warn('⚠️ Lỗi khi đồng bộ 1 sản phẩm từ POS:', itemErr);
    }
  }

  return {
    success: true,
    message: `Đã kéo thành công ${syncedCount} sản phẩm từ Pancake POS`,
    count: syncedCount,
  };
}
