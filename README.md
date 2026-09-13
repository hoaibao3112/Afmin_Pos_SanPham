# Afmin_Pos_SanPham

## ADMIN DASHBOARD & PANCAKE POS SYNCHRONIZATION

Hệ thống quản lý sản phẩm & tự động đồng bộ Pancake POS (pos.pancake.vn) được tách riêng 2 thư mục:

```
ADMIN/
├── backend/    (REST API: Node.js + Express + TypeScript + Prisma + PostgreSQL + Pancake Service)
└── frontend/   (Giao diện: Next.js 15 App Router + Tailwind v4 + Lucide Icons)
```

---

## 1. KHỞI ĐỘNG BACKEND (Cổng 5000)

```bash
cd backend
pnpm install # hoặc npm install

# 1. Cấu hình biến môi trường
# Mở file .env và điền PANCAKE_SHOP_ID, PANCAKE_API_TOKEN, PANCAKE_WAREHOUSE_ID, DATABASE_URL

# 2. Sinh Prisma Client
pnpm prisma:generate

# 3. Chạy máy chủ ở chế độ phát triển
pnpm dev
```

Máy chủ backend sẽ chạy tại: `http://localhost:5000`

---

## 2. KHỞI ĐỘNG FRONTEND (Cổng 3000)

```bash
cd frontend
pnpm install # hoặc npm install

# Chạy giao diện quản trị
pnpm dev
```

Mở trình duyệt: `http://localhost:3000`

---

## 3. TÍNH NĂNG CHÍNH

1. **Quản lý sản phẩm**: Thêm mới tên, SKU, giá bán, giá vốn, tồn kho, ảnh sản phẩm, mô tả.
2. **Đồng bộ Pancake POS tự động**: Gọi trực tiếp API Pancake POS khi tạo sản phẩm, lưu `pancakeProductId` và `pancakeVariationId`.
3. **Multi-tenant Isolation**: Mọi truy vấn CSDL đều được cô lập và lọc qua header `x-account-id`.
