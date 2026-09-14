'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Delete, RefreshCw, AlertCircle, Store } from 'lucide-react';

const PIN_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Xử lý gửi mã PIN lên server
  const submitPin = useCallback(async (pinToSubmit: string) => {
    if (loading || pinToSubmit.length !== PIN_LENGTH) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Chuyển hướng ngay vào trang quản trị
        router.replace('/products');
        router.refresh();
      } else {
        // Nhập sai PIN -> Rung lắc và báo lỗi
        setIsShaking(true);
        setErrorMsg(data.message || 'Mã PIN không đúng');
        setPin('');
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch (_err) {
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng thử lại.');
      setIsShaking(true);
      setPin('');
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  // Thêm một chữ số
  const handleDigit = useCallback((digit: string) => {
    if (loading) return;
    setErrorMsg(null);

    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === PIN_LENGTH) {
        // Tự động submit khi đủ 6 số
        setTimeout(() => submitPin(nextPin), 50);
      }
      return nextPin;
    });
  }, [loading, submitPin]);

  // Xóa 1 số
  const handleDelete = useCallback(() => {
    if (loading) return;
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  }, [loading]);

  // Xóa toàn bộ
  const handleClear = useCallback(() => {
    if (loading) return;
    setErrorMsg(null);
    setPin('');
  }, [loading]);

  // Bắt sự kiện gõ bàn phím vật lý
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20 mb-3.5">
            <Store className="h-8 w-8 text-white stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Cẩm Tuyền House
          </h1>
          <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mt-0.5">
            Hệ Thống Quản Trị Shop
          </p>
        </div>

        {/* Khung nhập PIN Glassmorphism */}
        <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Xác thực mã PIN bảo vệ (6 số)</span>
          </div>

          {/* 6 Ô hiển thị mã PIN */}
          <div
            className={`flex items-center justify-center gap-3 mb-6 transition-transform duration-200 ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
              const filled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`h-11 w-11 rounded-2xl border flex items-center justify-center transition-all duration-200 ${
                    filled
                      ? 'border-emerald-400 bg-emerald-500/20 scale-105 shadow-sm shadow-emerald-500/30'
                      : errorMsg
                      ? 'border-rose-500/50 bg-rose-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {filled ? (
                    <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 animate-in zoom-in-75 duration-150" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold mb-4 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Trạng thái loading */}
          {loading && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-4">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Đang kiểm tra bảo mật...</span>
            </div>
          )}

          {/* Bàn phím số Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={loading}
                className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-emerald-500/20 active:scale-95 text-xl font-bold border border-white/5 hover:border-white/20 transition cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            {/* Nút Xóa hết (C) */}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-slate-400 border border-white/5 transition cursor-pointer flex items-center justify-center disabled:opacity-30"
            >
              XÓA HẾT
            </button>

            {/* Số 0 */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-emerald-500/20 active:scale-95 text-xl font-bold border border-white/5 hover:border-white/20 transition cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            {/* Nút Backspace */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 border border-white/5 transition cursor-pointer flex items-center justify-center disabled:opacity-30"
              title="Xóa 1 số"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Ghi chú bảo mật & hỗ trợ */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-slate-400">
            Mã PIN mặc định: <span className="font-mono font-bold text-emerald-400">686868</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Khóa an toàn phiên làm việc 7 ngày • Cẩm Tuyền House Admin
          </p>
        </div>
      </div>
    </div>
  );
}
