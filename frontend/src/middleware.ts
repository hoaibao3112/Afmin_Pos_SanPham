import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lấy cookie session
  const sessionCookie = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
  const isAuthenticated = !!session;

  const isLoginPage = pathname === '/login';

  // 1. Nếu đã đăng nhập mà cố vào /login -> Chuyển hướng về /products
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/products', req.url));
  }

  // 2. Nếu chưa đăng nhập và không phải trang /login -> Bắt buộc chuyển về /login
  if (!isLoginPage && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Áp dụng middleware cho tất cả các đường dẫn TRỪ:
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - Các file tĩnh trong public (.svg, .png, .jpg, .webp, .ico)
     * - API routes xác thực (/api/auth/login, /api/auth/logout)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
