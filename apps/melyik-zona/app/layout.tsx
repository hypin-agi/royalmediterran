import type { Metadata, Viewport } from "next";
import "./globals.css";

const DESCRIPTION =
  "Egy gomb, és megmondja, melyik parkolási zónában állsz, kell-e most fizetni, és meddig tart a fizetős időszak. Ingyenes, reklámmentes, OpenStreetMap adatokból.";

export const metadata: Metadata = {
  title: {
    default: "Melyik Zóna? — GPS-alapú parkolási zóna kereső",
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "Melyik Zóna?",
  keywords: [
    "parkolási zóna",
    "zónakód",
    "parkolás",
    "Budapest parkolás",
    "GPS zóna",
  ],
  openGraph: {
    title: "Melyik Zóna? — GPS-alapú parkolási zóna kereső",
    description: DESCRIPTION,
    locale: "hu_HU",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Melyik Zóna?",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
