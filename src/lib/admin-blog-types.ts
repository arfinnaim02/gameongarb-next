export type BlogPostStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";

export type AdminBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageId: string;
  featuredImageAlt: string;
  category: string;
  status: BlogPostStatus;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogUploadResponse = {
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
};
