import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "JUK · Portal Interno",
    template: "%s · JUK",
  },
  description: "Portal de Gestión Interno de Jóvenes en UK",
  applicationName: "JUK Portal",
  appleWebApp: {
    capable: true,
    title: "JUK Portal",
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
  themeColor: "#0A1F44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
