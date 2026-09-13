export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  price: number | string;
  stock: number;
  imageUrl?: string | null;
  sku?: string | null;
  isSyncedToPos?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
}
