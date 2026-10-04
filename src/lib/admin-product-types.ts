import type {
  AdminSizeChartOption,
} from "@/lib/size-chart-types";

export type {
  AdminSizeChartOption,
};

export type AdminProductImage = {
  id: string;

  url: string;

  publicId:
    string | null;

  alt: string;

  /*
   * Empty/undefined means generic image.
   */
  color?:
    string;

  sortOrder:
    number;

  primary:
    boolean;
};

export type AdminProductVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  priceOverride: number | null;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

export type AdminProductRecord = {
  id: string;

  name: string;
  slug: string;

  shortDescription: string;
  description: string;

  brand: string;

  regularPrice: number;
  salePrice: number | null;

  status:
    | "DRAFT"
    | "ACTIVE"
    | "INACTIVE"
    | "ARCHIVED";

  featured: boolean;
  newArrival: boolean;
  trending: boolean;

  seoTitle: string;
  seoDescription: string;

  categoryId: string;
  category: string;

  sizeChartId: string;
  sizeChartName: string;

  image: string;

  images: AdminProductImage[];
  variants: AdminProductVariant[];

  stock: number;
  activeVariantCount: number;

  lowStock: boolean;
  outOfStock: boolean;

  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type ProductUploadResponse = {
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
};