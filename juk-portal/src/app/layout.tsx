import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "@/styles/globals.css";

// Dirección visual STUDIO: las familias se inyectan como CSS vars que
// consumen los tokens de design/studio/tokens.css (la fuente de verdad).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

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
};

export const viewport: Viewport = {
  themeColor: "#1f6f63",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`v-studio ${display.variable} ${body.variable} ${mono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
