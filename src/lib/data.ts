/**
 * Serializable catalog shape shared by server queries and interactive store UI.
 * Product records are always populated from Prisma; no demo catalog lives here.
 */
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  images: { url: string; alt: string }[];
  alt: string;
  colors: string[];
  sizes: string[];
  stock: number;
  badge?: string;
  reviewCount?: number;
  rating?: number;
  variants?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
    price: number;
  }[];
};
