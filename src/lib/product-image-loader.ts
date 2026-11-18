import type {
  ImageLoaderProps,
} from "next/image";

export function productImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps) {
  /*
   * Only transform actual Cloudinary images.
   * Existing local/legacy images remain on their
   * original URL.
   */
  if (
    !src.startsWith(
      "https://res.cloudinary.com/",
    )
  ) {
    return src;
  }

  const marker =
    "/image/upload/";

  if (
    !src.includes(
      marker,
    )
  ) {
    return src;
  }

  const transformations = [
    "c_limit",
    `w_${width}`,
    `q_${quality ?? "auto"}`,
    "f_auto",
  ].join(",");

  return src.replace(
    marker,
    `${marker}${transformations}/`,
  );
}
