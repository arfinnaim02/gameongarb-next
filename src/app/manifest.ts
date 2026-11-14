import type {
  MetadataRoute,
} from "next";

export default function manifest():
  MetadataRoute.Manifest {
  return {
    name:
      "GameOn Garb",

    short_name:
      "GameOn Garb",

    description:
      "Sneakers, football jerseys, sportswear and lifestyle fashion in Bangladesh.",

    start_url:
      "/",

    display:
      "standalone",

    background_color:
      "#ffffff",

    theme_color:
      "#0b0d0c",

    icons: [
      {
        src:
          "/favicon.svg",

        sizes:
          "any",

        type:
          "image/svg+xml",
      },
    ],
  };
}
