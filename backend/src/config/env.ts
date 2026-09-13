import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  PANCAKE_SHOP_ID: z.string().optional().default(''),
  PANCAKE_API_TOKEN: z.string().optional().default(''),
  PANCAKE_WAREHOUSE_ID: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Cấu hình môi trường không hợp lệ:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
