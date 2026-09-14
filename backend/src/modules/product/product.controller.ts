import { Request, Response, NextFunction } from 'express';
import { CreateProductSchema, UpdateProductSchema } from './product.schema.js';
import * as productService from './product.service.js';
import { z } from 'zod';

export async function getProductsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.listProducts();
    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = CreateProductSchema.parse(req.body);
    const newProduct = await productService.createProduct(validatedData);

    res.status(201).json({
      success: true,
      message: 'Thao tác thành công!',
      data: newProduct,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = UpdateProductSchema.parse(req.body);
    const updatedProduct = await productService.updateProduct(req.params.id, validatedData);

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công!',
      data: updatedProduct,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStockHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ stock: z.number().int().min(0) });
    const { stock } = schema.parse(req.body);
    const updated = await productService.updateStock(req.params.id, stock);

    res.json({
      success: true,
      message: 'Đã cập nhật số lượng tồn kho!',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function syncProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const synced = await productService.syncProductToPancake(req.params.id);

    res.json({
      success: true,
      message: 'Đã đồng bộ sản phẩm sang Pancake POS & Messenger!',
      data: synced,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

export async function syncProductsFromPancakeHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.syncProductsFromPancake();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
