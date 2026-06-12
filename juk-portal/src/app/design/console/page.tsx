import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

import "./tokens.css";

import { SubNav } from "./SubNav";
import { TokenStrip } from "./TokenStrip";
import { Alumnos } from "./screens/Alumnos";
import { Dashboard } from "./screens/Dashboard";
import { Login } from "./screens/Login";
import { Viaje } from "./screens/Viaje";

// Tipografías expuestas como CSS vars (consumidas por tokens.css):
//  - Display: Newsreader (serif editorial con carácter, no genérico)
//  - Body:    IBM Plex Sans (técnico/operativo, lejos de Inter/Roboto)
//  - Mono:    IBM Plex Mono (familia coherente, ideal para códigos/IDs)
const display = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-console-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-console-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-console-mono",
  display: "swap",
});

export const metadata = { title: "Console · JUK Design Lab" };

export default function ConsolePage() {
  return (
    <div
      className={`v-console ${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-[var(--c-bg)] font-[var(--font-body)] text-[var(--c-ink)] antialiased`}
    >
      <TokenStrip />
      <SubNav />

      <main className="mx-auto flex max-w-[1240px] flex-col gap-[var(--s-12)] px-[var(--s-6)] py-[var(--s-10)]">
        <Dashboard />
        <Alumnos />
        <Viaje />
        <Login />

        <footer className="border-t border-[var(--c-border)] py-[var(--s-6)] text-center">
          <p className="font-[var(--font-mono)] text-[length:var(--t-2xs)] uppercase tracking-[var(--ls-wide)] text-[var(--c-ink-4)]">
            JUK Portal · Dirección visual Console · concept de handoff (datos de ejemplo)
          </p>
        </footer>
      </main>
    </div>
  );
}
