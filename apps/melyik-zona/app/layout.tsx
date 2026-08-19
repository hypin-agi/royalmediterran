import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melyik Zóna? — GPS-alapú parkolási zóna kereső",
  description:
    "Egy gomb, és megmondja, melyik parkolási zónában állsz. Ingyenes, reklámmentes, OpenStreetMap adatokból.",
  applicationName: "Melyik Zóna?",
  appleWebApp: { capable: true, title: "Melyik Zóna?", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
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
