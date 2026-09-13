import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Cẩm Tuyền House - Quản Lý Kho & Đơn Hàng',
  description: 'Quản lý sản phẩm và đồng bộ tự động Pancake POS & Giỏ hàng Messenger',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cẩm Tuyền POS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 min-h-screen">
        <Navbar />
        {/* Nội dung trang với khoảng cách đệm an toàn dưới chân cho BottomNav trên iPhone */}
        <main className="min-h-[calc(100vh-4rem)] pb-24">{children}</main>
        {/* Thanh điều hướng dưới ngón tay cái cho iPhone 16 Pro Max */}
        <BottomNav />
      </body>
    </html>
  );
}
