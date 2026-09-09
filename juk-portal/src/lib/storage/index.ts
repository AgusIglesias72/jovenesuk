import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { validarDocumento } from "@/lib/domain/documentos";

import { keyEsSegura } from "./key";

/**
 * Storage de documentos (TEC-02): Cloudflare R2 vía S3 SDK. Los documentos son
 * pasaportes, certificados y consentimientos de menores, así que la URL que
 * devolvemos es SIEMPRE la del proxy autenticado (/api/uploads/<key>): nunca
 * una URL pública de bucket. El disco local (.uploads/, gitignored) existe solo
 * como fallback de dev/CI — en prod el filesystem de Vercel es efímero y perder
 * un pasaporte en silencio es peor que fallar la subida.
 */

export type PutResult = { key: string; url: string };
export type DocumentoLeido = { body: Buffer; contentType?: string; bytes: number };

export class StorageNoConfiguradoError extends Error {
  constructor() {
    super("El storage de documentos no está configurado (faltan las variables R2_*).");
    this.name = "StorageNoConfiguradoError";
  }
}

export class KeyInvalidaError extends Error {
  constructor() {
    super("La key del documento es inválida.");
    this.name = "KeyInvalidaError";
  }
}

function esProduccion(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Para el chequeo de arranque: en prod sin R2 los uploads fallan. */
export function storageConfigurado(): boolean {
  return r2Config() !== null;
}

let _client: S3Client | null = null;
function r2Client(cfg: NonNullable<ReturnType<typeof r2Config>>): S3Client {
  _client ??= new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return _client;
}

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

async function putLocal(key: string, body: Buffer): Promise<PutResult> {
  const filePath = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  return { key, url: `/api/uploads/${key}` };
}

export async function putDocumento(
  key: string,
  body: Buffer,
  contentType: string
): Promise<PutResult> {
  if (!keyEsSegura(key)) throw new KeyInvalidaError();

  // Último punto por el que pasan TODOS los uploads: acá se verifica que el
  // contenido real coincida con el tipo declarado por el cliente.
  validarDocumento({ mime: contentType, bytes: body.length, head: body.subarray(0, 16) });

  const cfg = r2Config();
  if (!cfg) {
    if (esProduccion()) throw new StorageNoConfiguradoError();
    return putLocal(key, body);
  }

  try {
    await r2Client(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return { key, url: `/api/uploads/${key}` };
  } catch (err) {
    if (esProduccion()) throw err;
    // En dev, credenciales de R2 inválidas no frenan el flujo: disco local.
    console.error("R2 no disponible; usando storage local (.uploads/):", (err as Error).message);
    return putLocal(key, body);
  }
}

/** Lectura por key para el proxy autenticado /api/uploads. */
export async function getDocumento(key: string): Promise<DocumentoLeido | null> {
  if (!keyEsSegura(key)) return null;

  const cfg = r2Config();
  if (cfg) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await r2Client(cfg).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      if (bytes) {
        const body = Buffer.from(bytes);
        return { body, contentType: res.ContentType, bytes: body.length };
      }
    } catch {
      // cae al disco local (objetos guardados por el fallback de dev)
    }
  }

  if (!cfg && esProduccion()) return null;

  try {
    const body = await readFile(path.join(LOCAL_DIR, key));
    return { body, bytes: body.length };
  } catch {
    return null;
  }
}
