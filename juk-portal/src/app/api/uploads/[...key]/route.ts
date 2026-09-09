import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/helpers";
import { getDocumentoAccesoByKey } from "@/lib/db/queries/documentos-acceso";
import type { User } from "@/lib/db/schema/users";
import { esMimePermitido, mimePorExtension } from "@/lib/domain/documentos";
import { getDocumento } from "@/lib/storage";
import { contentDisposition } from "@/lib/storage/content-disposition";
import { keyEsSegura, nombreDesdeKey } from "@/lib/storage/key";

/**
 * Proxy autenticado de documentos: sirve archivos del storage (R2, o disco
 * local en dev) solo a quien tiene derecho a verlos. Los documentos son
 * pasaportes, certificados psicofísicos y consentimientos de menores, así que
 * nunca se exponen por una URL pública de bucket.
 *
 * Autorización: admin_juk/super_admin ven todo; el rol familia solo los
 * documentos de sus propios alumnos; el resto, nada. Todo lo que no se puede
 * ver responde 404 para no revelar si la key existe.
 */

const CABECERAS_BASE = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/**
 * PDF e imágenes van inline: el tablero M6 los revisa sin descargarlos. Todo lo
 * demás (DOC/DOCX, tipos desconocidos) va como attachment, porque el navegador
 * no los renderiza y así nada se abre desde el origin del portal.
 */
const INLINE: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function noEncontrado() {
  return NextResponse.json({ error: "No encontrado" }, { status: 404, headers: CABECERAS_BASE });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await getSession();
  if (!session || session.user.isActive === false) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CABECERAS_BASE });
  }

  const { key } = await params;
  const storageKey = key.join("/");
  if (!keyEsSegura(storageKey)) return noEncontrado();

  const rol = session.user.role as User["role"];
  const esAdmin = rol === "admin_juk" || rol === "super_admin";

  const meta = await getDocumentoAccesoByKey(storageKey);
  if (!esAdmin) {
    if (rol !== "familia") return noEncontrado();
    if (!meta || meta.familiaUserId !== session.user.id) return noEncontrado();
  }

  const doc = await getDocumento(storageKey);
  if (!doc) return noEncontrado();

  const declarado = meta?.mimeType ?? doc.contentType;
  const mime =
    declarado && esMimePermitido(declarado)
      ? declarado
      : (mimePorExtension(storageKey) ?? "application/octet-stream");

  return new NextResponse(new Uint8Array(doc.body), {
    headers: {
      ...CABECERAS_BASE,
      "Content-Type": mime,
      "Content-Length": String(doc.bytes),
      "Content-Security-Policy": "sandbox",
      "Content-Disposition": contentDisposition({
        nombre: meta?.nombreOriginal ?? nombreDesdeKey(storageKey),
        inline: INLINE.has(mime),
      }),
    },
  });
}
