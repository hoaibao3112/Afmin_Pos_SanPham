'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, uploadImageFile } from '@/lib/api';
import {
  ChevronLeft,
  Plus,
  Check,
  Sparkles,
  RefreshCw,
  Smartphone,
  Minus,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Wand2,
  Camera,
  Trash2,
} from 'lucide-react';

const POPULAR_CATEGORIES = [
  'Trái Cây Tươi',
  'Rau Củ Đà Lạt',
  'Lạp Xưởng Cai Lậy',
  'Bánh Hạt & Sữa',
  'Đồ Khô Ăn Vặt',
  'Mặc định',
];

// Ảnh mẫu sản phẩm đặc sản thật của Cẩm Tuyền House để bấm chọn nhanh 1 chạm
const PRESET_IMAGES = [
  {
    name: 'Lạp Xưởng Tôm',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&h=500&fit=crop&q=80',
    desc: 'Lạp xưởng tôm đặc sản trứ danh Cai Lậy, thịt thơm ngọt đậm đà, hút chân không sạch sẽ.',
    price: 255000,
    cat: 'Lạp Xưởng Cai Lậy',
  },
  {
    name: 'Hồng Mật Fuji Đà Lạt',
    url: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=500&h=500&fit=crop&q=80',
    desc: 'Hồng chín cây tự nhiên Đà Lạt, lòng mật ngọt lịm, thịt giòn tan không chát.',
    price: 99000,
    cat: 'Trái Cây Tươi',
  },
  {
    name: 'Nho Trái Tim My Heart',
    url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500&h=500&fit=crop&q=80',
    desc: 'Nho nhập khẩu hình trái tim độc đáo, giòn rụm ngọt đậm, sang trọng làm quà biếu.',
    price: 289000,
    cat: 'Trái Cây Tươi',
  },
  {
    name: 'Ớt Ngọt Sweet Palermo',
    url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&h=500&fit=crop&q=80',
    desc: 'Ớt ngọt Palermo Đà Lạt giòn mọng hoàn toàn không cay, ăn sống hoặc ép nước cực tốt cho da.',
    price: 99000,
    cat: 'Rau Củ Đà Lạt',
  },
];

export default function MobileAddProductPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 6 Trường chuẩn Meta Facebook Shopping
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Trái Cây Tươi');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);
  const [price, setPrice] = useState<number | string>(99000);
  const [stock, setStock] = useState<number>(20);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Device mockup view toggle on Desktop
  const [previewMode, setPreviewMode] = useState<'iphone' | 'full'>('iphone');

  // UI state
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const res = await uploadImageFile(file);
      setImageUrl(res.url);
      showToast('success', `Đã tối ưu ảnh trên máy chủ (${res.sizeKb} KB, vuông 800x800)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý ảnh';
      showToast('error', msg);
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Format number to VNĐ
  const formatVND = (val: number | string) => {
    const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('vi-VN');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setPrice(rawVal ? Number(rawVal) : '');
  };

  const handleStockChange = (delta: number) => {
    setStock((prev) => Math.max(1, prev + delta));
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setShowCustomCatInput(false);
  };

  // Bấm chọn 1 sản phẩm mẫu có sẵn
  const handleApplyPreset = (item: (typeof PRESET_IMAGES)[0]) => {
    setName(item.name);
    setCategory(item.cat);
    setPrice(item.price);
    setDescription(item.desc);
    setImageUrl(item.url);
    showToast('success', `Đã chọn mẫu "${item.name}"`);
  };

  // Tự động sinh câu mô tả chuẩn Meta nếu lười gõ
  const handleAutoDesc = () => {
    if (!name.trim()) {
      showToast('error', 'Vui lòng nhập tên sản phẩm trước');
      return;
    }
    setDescription(`${name.trim()} tươi sạch chất lượng cao của Cẩm Tuyền House, đóng gói kỹ càng, giao nhanh toàn quốc.`);
  };

  // Kiểm tra điều kiện Meta
  const isMetaValid =
    name.trim().length > 0 &&
    Number(price) > 0 &&
    Number(stock) > 0 &&
    description.trim().length > 0 &&
    imageUrl.trim().length > 0;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    if (Number(price) <= 0) {
      showToast('error', 'Giá bán phải lớn hơn 0đ (tiêu chuẩn Meta)');
      return;
    }
    if (Number(stock) <= 0) {
      showToast('error', 'Tồn kho phải lớn hơn 0 để hiện trên Messenger');
      return;
    }
    if (!description.trim()) {
      showToast('error', 'Meta bắt buộc phải có câu mô tả tiếng Việt');
      return;
    }
    if (!imageUrl.trim()) {
      showToast('error', 'Meta bắt buộc phải có ảnh để hiện trong Giỏ hàng Messenger');
      return;
    }

    setSaving(true);
    try {
      const finalCategory = showCustomCatInput && customCategory.trim() ? customCategory.trim() : category;

      await fetchApi('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category: finalCategory,
          price: Number(price) || 0,
          stock: Number(stock) || 0,
          description: description.trim(),
          imageUrl: imageUrl.trim(),
        }),
      });

      showToast('success', 'Đã lưu & đồng bộ sang Pancake POS / Giỏ hàng Messenger!');
      setTimeout(() => {
        startTransition(() => {
          router.push('/products');
        });
      }, 1200);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      showToast('error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-0 sm:py-8 dark:bg-slate-950 flex flex-col items-center justify-center font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 z-[999] flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 text-white'
              : 'bg-rose-600/95 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="h-4 w-4 stroke-[3]" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Desktop Device Switcher Bar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[440px] mb-3 px-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Smartphone className="h-4 w-4 text-emerald-600" />
          <span>Mô phỏng iPhone 16 Pro Max (6.9&quot;)</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setPreviewMode('iphone')}
            className={`px-3 py-1 rounded-lg transition ${
              previewMode === 'iphone'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Khung iPhone
          </button>
          <button
            onClick={() => setPreviewMode('full')}
            className={`px-3 py-1 rounded-lg transition ${
              previewMode === 'full'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Toàn màn hình
          </button>
        </div>
      </div>

      {/* THE IPHONE 16 PRO MAX CHASSIS */}
      <div
        className={`w-full transition-all duration-300 ${
          previewMode === 'iphone'
            ? 'sm:max-w-[430px] sm:h-[940px] sm:rounded-[56px] sm:border-[10px] sm:border-slate-800 sm:dark:border-slate-700 sm:shadow-[0_25px_70px_rgba(0,0,0,0.35)] sm:overflow-hidden relative flex flex-col bg-slate-50 dark:bg-[#0b0f17]'
            : 'max-w-2xl bg-white dark:bg-slate-900 sm:rounded-3xl sm:border border-slate-200 dark:border-slate-800 shadow-lg min-h-screen sm:min-h-[850px] relative flex flex-col'
        }`}
      >
        {/* Dynamic Island */}
        {previewMode === 'iphone' && (
          <div className="hidden sm:flex justify-center pt-2.5 pb-1 relative z-50 bg-slate-50 dark:bg-[#0b0f17]">
            <div className="h-[34px] w-[125px] bg-black rounded-full flex items-center justify-between px-3 text-[10px] text-white font-mono shadow-md">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-200 tracking-wider">CẨM TUYỀN</span>
              <div className="h-3 w-3 rounded-full border border-slate-600 bg-slate-900"></div>
            </div>
          </div>
        )}

        {/* TOP APP BAR */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0b0f17]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 pt-3 pb-3 px-4 flex items-center justify-between">
          <Link
            href="/products"
            className="flex items-center gap-1.5 -ml-1 text-slate-600 dark:text-slate-300 active:opacity-60 transition"
          >
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <ChevronLeft className="h-5 w-5" />
            </div>
          </Link>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Cẩm Tuyền House
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Thêm sản phẩm Messenger
            </h1>
          </div>

          <div className="w-9 flex justify-end">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50">
              POS
            </span>
          </div>
        </header>

        {/* SCROLLABLE FORM BODY */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40">
          {/* GỢI Ý CHỌN NHANH MẪU ĐẶC SẢN CẨM TUYỀN */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-3 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Mẫu đặc sản sẵn có (chọn 1 chạm):
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {PRESET_IMAGES.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleApplyPreset(item)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 shrink-0 shadow-2xs active:scale-95 transition"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* 1. HÌNH ẢNH SẢN PHẨM (TỐI ƯU TỰ ĐỘNG QUA BACKEND SHARP) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-emerald-600" />
                Ảnh sản phẩm (Chọn từ điện thoại) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Tự cắt vuông 800x800
              </span>
            </div>

            {/* Ẩn input file */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex gap-3 items-center">
              {/* Khung ảnh vuông: Chạm vào là mở ngay thư viện ảnh */}
              <div
                onClick={() => !compressing && fileInputRef.current?.click()}
                className="h-24 w-24 shrink-0 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center relative cursor-pointer active:scale-95 transition shadow-2xs group"
                title="Chạm để chọn hoặc đổi ảnh từ máy"
              >
                {compressing ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-1" />
                    <span className="text-[9px] font-bold text-emerald-600">Đang nén...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                      Đổi ảnh
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <Camera className="h-7 w-7 text-emerald-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Chạm chọn ảnh</span>
                  </div>
                )}
              </div>

              {/* Nút bấm to rõ cho điện thoại */}
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Camera className="h-4 w-4 stroke-[2.5]" />
                  <span>{imageUrl ? 'Đổi ảnh khác từ máy' : 'Chọn ảnh / Chụp ảnh ngay'}</span>
                </button>

                {imageUrl ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-[3]" /> Ảnh đã tối ưu xong
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Gỡ ảnh
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Chạm để mở Thư viện ảnh / Camera trên điện thoại. Ảnh nặng mấy chục MB cũng tự được máy chủ nén vuông đẹp!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. TÊN SẢN PHẨM */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              Tên sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Lạp Xưởng Tôm Cai Lậy / Hồng Mật..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal bg-transparent border-none outline-hidden p-0 focus:ring-0"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* 3. NHÓM SẢN PHẨM */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Nhóm sản phẩm
              </label>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {showCustomCatInput ? customCategory || 'Tùy chỉnh' : category}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
              {POPULAR_CATEGORIES.map((cat) => {
                const isActive = !showCustomCatInput && category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`h-10 px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    {cat}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCustomCatInput(!showCustomCatInput)}
                className={`h-10 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border border-dashed active:scale-95 ${
                  showCustomCatInput
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Nhóm khác</span>
              </button>
            </div>

            {showCustomCatInput && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Nhập tên nhóm mới..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:border-emerald-500 outline-hidden"
                  style={{ fontSize: '16px' }}
                />
              </div>
            )}
          </div>

          {/* 4 & 5. GIÁ BÁN & TỒN KHO */}
          <div className="grid grid-cols-2 gap-3">
            {/* Giá bán */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1">
                Giá bán (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="0"
                  value={price ? formatVND(price) : ''}
                  onChange={handlePriceChange}
                  className="w-full text-lg font-black text-slate-900 dark:text-white bg-transparent border-none outline-hidden p-0 pr-6"
                  style={{ fontSize: '18px' }}
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  đ
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                {price ? `${formatVND(price)} đồng` : 'Nhập giá'}
              </div>
            </div>

            {/* Tồn kho */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                  Tồn kho <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-600 font-bold">&gt; 0</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStockChange(-1)}
                  disabled={stock <= 1}
                  className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-90 transition disabled:opacity-30"
                >
                  <Minus className="h-4 w-4 stroke-[2.5]" />
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={stock}
                  onChange={(e) => setStock(Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 text-center text-lg font-black text-slate-900 dark:text-white bg-transparent border-none outline-hidden p-0"
                  style={{ fontSize: '18px' }}
                />

                <button
                  type="button"
                  onClick={() => handleStockChange(1)}
                  className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center active:scale-90 transition"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-center text-slate-400">Số lượng có thể bán</div>
            </div>
          </div>

          {/* 6. MÔ TẢ TIẾNG VIỆT (BẮT BUỘC META) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Mô tả sản phẩm <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDesc}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <Wand2 className="h-3 w-3" />
                Mẫu tự động
              </button>
            </div>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="VD: Lạp xưởng tôm nạc tươi ngon đặc sản Cai Lậy, đóng gói hút chân không sạch sẽ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 bg-transparent border-none outline-hidden p-0 resize-none"
              style={{ fontSize: '16px' }}
            />
            <div className="mt-1 text-[10px] text-slate-400">
              * Meta yêu cầu câu tiếng Việt hoàn chỉnh để duyệt hiển thị giỏ hàng
            </div>
          </div>

          {/* CHECKLIST 6 TIÊU CHUẨN META SHOPPING */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className={`h-4 w-4 ${isMetaValid ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Tiêu chuẩn duyệt Giỏ hàng Messenger:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={name ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 1. Tên rõ ràng
              </div>
              <div className={Number(price) > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 2. Giá &gt; 0đ
              </div>
              <div className={Number(stock) > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 3. Tồn kho &gt; 0
              </div>
              <div className={description ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 4. Mô tả tiếng Việt
              </div>
              <div className={category ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 5. Danh mục
              </div>
              <div className={imageUrl ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                ✓ 6. Ảnh vuông (≥ 500px)
              </div>
            </div>
          </div>
        </main>

        {/* STICKY BOTTOM ACTION BAR (iPhone 16 Pro Max Thumb Zone) */}
        <footer className="absolute bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#0b0f17]/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 pt-3 pb-8 sm:pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="h-13 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95 transition"
            >
              Hủy
            </Link>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="h-13 flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Đang đẩy sang POS &amp; Messenger...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 stroke-[3]" />
                  <span>Lưu &amp; Đồng bộ Messenger</span>
                </>
              )}
            </button>
          </div>

          {previewMode === 'iphone' && (
            <div className="mt-3 flex justify-center">
              <div className="h-1 w-32 rounded-full bg-slate-300 dark:bg-slate-700"></div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
