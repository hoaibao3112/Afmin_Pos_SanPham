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

export async function POST(req: NextRequest) {
  try {
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

    // Kiểm tra mã PIN
    const isValid = verifyPin(pin);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã PIN không chính xác. Vui lòng kiểm tra lại.',
        },
        { status: 401 }
      );
    }

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
