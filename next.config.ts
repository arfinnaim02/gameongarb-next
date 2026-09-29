import type {
  NextConfig,
} from "next";

const nextConfig:
  NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol:
          "https",

        hostname:
          "images.unsplash.com",
      },

      {
        protocol:
          "https",

        hostname:
          "res.cloudinary.com",
      },
    ],
  },

  poweredByHeader:
    false,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
    ],
  },
};

export default nextConfig;