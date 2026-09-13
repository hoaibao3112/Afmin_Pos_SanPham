import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().trim().min(1, 'Tên sản phẩm không được để trống'),
  category: z.string().trim().default('Chung'),
  description: z.string().trim().optional().or(z.literal('')),
  price: z.number().min(0, 'Giá bán không được âm'),
  stock: z.number().int().min(0, 'Tồn kho không được âm').default(10),
  imageUrl: z.string().trim().optional().or(z.literal('')),
});

export const UpdateProductSchema = z.object({
  name: z.string().trim().min(1, 'Tên sản phẩm không được để trống').optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().optional().or(z.literal('')),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().trim().optional().or(z.literal('')),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
