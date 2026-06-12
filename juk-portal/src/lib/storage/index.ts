import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Storage de documentos (TEC-02): Cloudflare R2 vía S3 SDK cuando hay
 * credenciales; fallback a disco local (.uploads/, gitignored, servido por
 * /api/uploads autenticado) para dev/CI sin R2.
 */

export type PutResult = { key: string; url: string };

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
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
  const cfg = r2Config();

  if (cfg) {
    try {
      await r2Client(cfg).send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
      // Sin bucket público configurado, servimos vía el proxy autenticado.
      const url = publicBase ? `${publicBase}/${key}` : `/api/uploads/${key}`;
      return { key, url };
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
      // En dev, credenciales de R2 inválidas no frenan el flujo: disco local.
      console.error("R2 no disponible; usando storage local (.uploads/):", (err as Error).message);
      return putLocal(key, body);
    }
  }

  return putLocal(key, body);
}

/** Lectura para el proxy autenticado /api/uploads (local o R2 sin bucket público). */
export async function getDocumento(
  key: string
): Promise<{ body: Buffer; contentType?: string } | null> {
  const cfg = r2Config();
  if (cfg) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await r2Client(cfg).send(
        new GetObjectCommand({ Bucket: cfg.bucket, Key: key })
      );
      const bytes = await res.Body?.transformToByteArray();
      if (bytes) return { body: Buffer.from(bytes), contentType: res.ContentType };
    } catch {
      // cae al disco local (objetos guardados por el fallback de dev)
    }
  }
  try {
    const body = await readFile(path.join(LOCAL_DIR, key));
    return { body };
  } catch {
    return null;
  }
}
