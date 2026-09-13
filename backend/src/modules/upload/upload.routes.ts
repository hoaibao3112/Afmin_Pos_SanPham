import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const router = Router();

// Thư mục lưu trữ ảnh tối ưu
const uploadDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer nhận file trong bộ nhớ RAM để Sharp tối ưu ngay lập tức
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Hỗ trợ ảnh gốc lên đến 25MB từ camera 48MP iPhone 16 Pro Max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file định dạng hình ảnh (JPG, PNG, WEBP, HEIC...)'));
    }
  },
});

/**
 * POST /api/upload
 * Nhận ảnh gốc dung lượng lớn từ điện thoại -> Tự động cắt vuông 1:1 và nén chuẩn WebP < 100KB
 */
router.post('/', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh từ điện thoại' });
      return;
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `prod-${timestamp}-${randomStr}.webp`;
    const outputPath = path.join(uploadDir, filename);

    // Dùng SHARP tối ưu toàn diện:
    // 1. .rotate(): Tự động nhận diện hướng chụp iPhone (chống xoay ngược ảnh dọc/ngang)
    // 2. .resize(800, 800, fit: 'cover'): Cắt chuẩn vuông 1:1 ở tâm hình
    // 3. .webp({ quality: 82 }): Nén ảnh sắc nét tuyệt đối nhưng dung lượng siêu nhẹ (~40-80KB)
    const processedInfo = await sharp(req.file.buffer)
      .rotate()
      .resize(800, 800, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(outputPath);

    // Sinh đường dẫn truy cập ảnh
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const relativeUrl = `/uploads/${filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    console.log(`📸 [Tối ưu ảnh Backend]: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB) -> ${filename} (${(processedInfo.size / 1024).toFixed(1)} KB - 800x800 WebP)`);

    res.json({
      success: true,
      message: 'Đã tải lên và tối ưu ảnh vuông 1:1 thành công!',
      url: fullUrl,
      relativeUrl,
      sizeKb: (processedInfo.size / 1024).toFixed(1),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi xử lý ảnh trên máy chủ';
    console.error('Lỗi upload ảnh:', err);
    res.status(500).json({ success: false, message: errorMsg });
  }
});

export default router;
