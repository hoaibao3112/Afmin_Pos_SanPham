import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPin, createSessionToken, COOKIE_NAME } from '@/lib/auth';

const loginSchema = z.object({
  pin: z
    .string()
    .min(4, 'Mã PIN phải từ 4 đến 8 chữ số')
    .max(8, 'Mã PIN tối đa 8 chữ số')
    .regex(/^\d+$/, 'Mã PIN chỉ được chứa chữ số'),
});

// Chống Brute Force: Giới hạn số lần thử theo IP (Max 5 lần / khóa 15 phút)
interface AttemptRecord {
  count: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 phút

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown-ip';
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const attempt = loginAttempts.get(clientIp);

    // 1. Kiểm tra nếu IP đang bị khóa
    if (attempt?.blockedUntil && now < attempt.blockedUntil) {
      const remainingMinutes = Math.ceil((attempt.blockedUntil - now) / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `Nhập sai quá ${MAX_FAILED_ATTEMPTS} lần! Vui lòng chờ ${remainingMinutes} phút nữa để thử lại.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: firstIssue?.message || 'Dữ liệu không hợp lệ',
        },
        { status: 400 }
      );
    }

    const { pin } = parsed.data;

    // 2. Kiểm tra mã PIN an toàn
    const isValid = verifyPin(pin);
    if (!isValid) {
      const currentCount = (attempt?.count || 0) + 1;

      if (currentCount >= MAX_FAILED_ATTEMPTS) {
        loginAttempts.set(clientIp, {
          count: currentCount,
          blockedUntil: now + BLOCK_DURATION_MS,
        });
        return NextResponse.json(
          {
            success: false,
            message: `Mã PIN không chính xác! Đã sai ${currentCount}/${MAX_FAILED_ATTEMPTS} lần. Tạm thời khóa 15 phút để bảo vệ.`,
          },
          { status: 429 }
        );
      } else {
        loginAttempts.set(clientIp, { count: currentCount });
        return NextResponse.json(
          {
            success: false,
            message: `Mã PIN không đúng (còn ${MAX_FAILED_ATTEMPTS - currentCount} lần thử).`,
          },
          { status: 401 }
        );
      }
    }

    // 3. Đăng nhập thành công -> Xóa bộ đếm vi phạm của IP
    loginAttempts.delete(clientIp);

    // Tạo JWT token phiên làm việc
    const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID || 'acc_default';
    const token = await createSessionToken(accountId);

    // Chuẩn bị response và gắn HTTPOnly Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Xác thực thành công',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
    });

    return response;
  } catch (error) {
    console.error('Lỗi khi xử lý đăng nhập PIN:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}
