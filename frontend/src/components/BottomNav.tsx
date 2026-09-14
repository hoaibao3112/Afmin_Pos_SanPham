'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Plus, ReceiptText } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  const isProducts = pathname === '/products';
  const isOrders = pathname.startsWith('/orders');
  const isNewProduct = pathname === '/products/new';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-6 shadow-lg shadow-black/5">
      <div className="mx-auto max-w-md flex items-center justify-around">
        {/* Tab 1: Kho Sản phẩm */}
        <Link
          href="/products"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all active:scale-95 ${
            isProducts
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 font-medium'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              isProducts ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''
            }`}
          >
            <Package className="h-5 w-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] tracking-tight">Sản phẩm</span>
        </Link>

        {/* Tab 2 (Chính giữa): Nút Thêm Món To Tròn Dễ Bấm Ngay Ngón Cái */}
        <Link
          href="/products/new"
          className={`flex flex-col items-center -mt-5 active:scale-90 transition-transform ${
            isNewProduct ? 'opacity-90' : ''
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/35 border-4 border-white dark:border-slate-950">
            <Plus className="h-7 w-7 stroke-[3]" />
          </div>
          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            Thêm món
          </span>
        </Link>

        {/* Tab 3: Đơn hàng & Hóa đơn */}
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all active:scale-95 ${
            isOrders
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 font-medium'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              isOrders ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''
            }`}
          >
            <ReceiptText className="h-5 w-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] tracking-tight">Đơn hàng</span>
        </Link>
      </div>
    </nav>
  );
}
