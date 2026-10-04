/**
 * Serializable catalog shapes shared
 * by server queries and interactive
 * storefront components.
 *
 * Products are populated from Prisma.
 */

export type ProductVariant = {
  id: string;
  sku: string;

  size: string;
  color: string;

  colorHex?: string;

  stock: number;
  price: number;
};

export type Product = {
  id: string;

  slug: string;
  name: string;

  category: string;

  /*
   * Lowest/current storefront price.
   * Variant-specific prices can override
   * this once a variant is selected.
   */
  price: number;

  oldPrice?: number;

  /*
   * True when active variants do not
   * all use the same selling price.
   */
  priceVaries?: boolean;

  image: string;

  images: {
    url: string;
    alt: string;

    /*
     * Assigned variant color.
     * Undefined means generic image.
     */
    color?: string;
  }[];

  alt: string;

  colors: string[];
  sizes: string[];

  stock: number;

  badge?: string;

  reviewCount?: number;
  rating?: number;

  variants?: ProductVariant[];
};