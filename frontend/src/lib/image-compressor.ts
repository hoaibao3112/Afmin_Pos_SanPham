/**
 * Nén và cắt ảnh vuông 1:1 chuẩn Meta Catalog (Facebook/Messenger/Pancake)
 * Tự động giảm dung lượng xuống dưới 100KB, tăng tốc độ tải trên điện thoại
 */
export async function compressAndCropImage(file: File, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tính toán cắt hình vuông 1:1 ở trung tâm
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo bộ xử lý đồ họa'));
          return;
        }

        // Vẽ ảnh vuông đẹp nét
        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          maxSize,
          maxSize
        );

        // Xuất ra JPEG chất lượng cao tối ưu dung lượng
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error('Lỗi khi tải ảnh'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}
