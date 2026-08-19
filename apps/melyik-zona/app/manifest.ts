import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Melyik Zóna? — parkolási zóna kereső",
    short_name: "Melyik Zóna?",
    description:
      "GPS-alapú parkolási zóna kereső. Egy gomb, és megmondja, melyik zónában állsz.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    lang: "hu",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
