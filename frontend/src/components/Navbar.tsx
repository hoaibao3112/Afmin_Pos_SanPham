'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Package, ReceiptText } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isProducts = pathname.startsWith('/products');
  const isOrders = pathname.startsWith('/orders');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        {/* Brand */}
        <Link href="/products" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight">CẨM TUYỀN HOUSE</span>
            <span className="text-[10px] text-slate-400 font-semibold">Cai Lậy • Kho & Đơn Hàng</span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <Link
            href="/products"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isProducts
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Kho món</span>
          </Link>

          <Link
            href="/orders"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isOrders
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <ReceiptText className="h-3.5 w-3.5" />
            <span>Đơn hàng</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
