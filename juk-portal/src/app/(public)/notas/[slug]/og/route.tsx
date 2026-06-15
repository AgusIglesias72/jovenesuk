import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { NOTAS, getNota } from "../../notas-data";

export const runtime = "nodejs";

export function generateStaticParams() {
  return NOTAS.map((n) => ({ slug: n.slug }));
}

const BRAND_INK = "#173f3a";
const BRAND = "#1f6f63";
const ACCENT = "#ff8a5b";
const HONEY = "#f7b955";
const ON_BRAND = "#f4faf7";
const ON_BRAND_MUTED = "#a9c8c0";
const BRAND_300 = "#9fd9cf";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const nota = getNota(slug);
  if (!nota) {
    return new Response("Not found", { status: 404 });
  }

  const fontsDir = join(process.cwd(), "public", "fonts");
  let fontBold: Buffer;
  let fontMedium: Buffer;
  try {
    [fontBold, fontMedium] = await Promise.all([
      readFile(join(fontsDir, "montserrat-800.ttf")),
      readFile(join(fontsDir, "montserrat-500.ttf")),
    ]);
  } catch {
    return new Response("Font assets not found", { status: 500 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: BRAND_INK,
          backgroundImage: `radial-gradient(900px 500px at 85% -10%, rgba(255,138,91,0.22), transparent 60%), radial-gradient(700px 420px at -10% 120%, rgba(70,179,160,0.26), transparent 55%)`,
          fontFamily: "Montserrat",
          color: ON_BRAND,
        }}
      >
        {/* Encabezado: marca + categoría */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: "52px",
                height: "52px",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "14px",
                background: `linear-gradient(135deg, #2a8576 0%, ${BRAND} 60%, ${BRAND_INK} 100%)`,
                fontSize: "24px",
                fontWeight: 800,
                marginRight: "18px",
              }}
            >
              UK
            </div>
            <div style={{ fontSize: "30px", fontWeight: 700 }}>Jóvenes en UK</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: HONEY,
            }}
          >
            {nota.categoria}
          </div>
        </div>

        {/* Título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: "1000px",
            }}
          >
            {nota.titulo}
          </div>
          <div
            style={{
              marginTop: "28px",
              height: "8px",
              width: "120px",
              borderRadius: "999px",
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${HONEY} 100%)`,
            }}
          />
        </div>

        {/* Pie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "24px", color: ON_BRAND_MUTED }}>
            Guías para estudiar inglés en el exterior
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: BRAND_300 }}>jovenesenuk.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Montserrat", data: fontBold, weight: 800, style: "normal" },
        { name: "Montserrat", data: fontMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
