import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let lastDbCheck = 0;
let dbAvailable = false;

/**
 * Kiểm tra trạng thái kết nối PostgreSQL có sẵn sàng không
 * Cache kết quả trong 15s để không bị nghẽn thời gian phản hồi (sub-millisecond)
 */
export async function checkDbAvailability(): Promise<boolean> {
  const now = Date.now();
  if (now - lastDbCheck < 15000) {
    return dbAvailable;
  }
  lastDbCheck = now;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB Timeout')), 50)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
    dbAvailable = true;
  } catch (_e) {
    dbAvailable = false;
  }
  return dbAvailable;
}
