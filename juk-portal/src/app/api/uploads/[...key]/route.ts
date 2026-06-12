import { NextResponse, type NextRequest } from "next/server";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { getDocumento } from "@/lib/storage";

/**
 * Proxy autenticado de documentos: sirve archivos del storage (R2 o disco
 * local en dev) solo a usuarios con sesión de admin. Evita exponer un bucket
 * público para documentación sensible (pasaportes, certificados médicos).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  await requireAdminJuk();

  const { key } = await params;
  const storageKey = key.join("/");
  if (storageKey.includes("..")) {
    return NextResponse.json({ error: "Key inválida" }, { status: 400 });
  }

  const doc = await getDocumento(storageKey);
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return new NextResponse(new Uint8Array(doc.body), {
    headers: {
      "Content-Type": doc.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${storageKey.split("/").pop()}"`,
    },
  });
}
