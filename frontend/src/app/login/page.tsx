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
        setErrorMsg(data.message || 'Mã PIN không chính xác');
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
    <div className="min-h-screen bg-linear-to-br from-emerald-50/90 via-slate-50 to-teal-50/70 text-slate-900 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Hiệu ứng hào quang tươi sáng nền */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-300/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-200/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center z-10">
        {/* Logo & Tên Shop */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-100 mb-3 transition-transform hover:scale-105">
            <Store className="h-8 w-8 text-white stroke-[2.3]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Cẩm Tuyền House
          </h1>
          <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase mt-0.5">
            Hệ Thống Quản Trị Shop
          </p>
        </div>

        {/* Khung nhập PIN Glassmorphism Tươi Sáng */}
        <div className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-950/5 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-700 mb-5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Xác thực mã PIN (6 số)</span>
          </div>

          {/* 6 Ô tròn hiển thị mã PIN */}
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
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-500/25 scale-105 ring-2 ring-emerald-200'
                      : errorMsg
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-slate-200 bg-slate-100/70'
                  }`}
                >
                  {filled ? (
                    <div className="h-3.5 w-3.5 rounded-full bg-emerald-600 animate-in zoom-in-75 duration-150" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold mb-4 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Trạng thái loading */}
          {loading && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-4 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              <span>Đang kiểm tra bảo mật...</span>
            </div>
          )}

          {/* Bàn phím số Keypad Tươi Sáng & Nhạy Thao Tác */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={loading}
                className="h-14 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:bg-emerald-100 active:scale-95 text-xl font-extrabold text-slate-800 border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            {/* Nút Xóa hết (C) */}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs font-bold text-slate-600 border border-slate-200 transition-all cursor-pointer flex items-center justify-center disabled:opacity-30"
            >
              XÓA HẾT
            </button>

            {/* Số 0 */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:bg-emerald-100 active:scale-95 text-xl font-extrabold text-slate-800 border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            {/* Nút Backspace */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center justify-center disabled:opacity-30"
              title="Xóa 1 số"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bản quyền & bảo mật */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            © Cẩm Tuyền House • Hệ Thống Quản Trị Bảo Mật
          </p>
        </div>
      </div>
    </div>
  );
}
