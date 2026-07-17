import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "@/components/pwa-installer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nex Rural",
  description: "Gestao inteligente para regularizacao rural",
  manifest: "/manifest.webmanifest",
  applicationName: "Nex Rural",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nex Rural"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#163b2c",
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
