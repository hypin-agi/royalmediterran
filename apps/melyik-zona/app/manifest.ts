import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Melyik Zóna? — parkolási zóna kereső",
    short_name: "Melyik Zóna?",
    description:
      "GPS-alapú parkolási zóna kereső. Egy gomb, és megmondja, melyik zónában állsz.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#ffffff",
    lang: "hu",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
