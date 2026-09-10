export const PAGE_SIZE = 50;

export type Paginado<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};

/** Ventana pedida por el searchParam `page`. */
export type Pagina = { page: number; size: number };

/** Normaliza el searchParam `page`: vacío, no numérico o < 1 caen en la 1. */
export function pagina(pageParam: string | undefined, size: number = PAGE_SIZE): Pagina {
  const n = Math.floor(Number(pageParam));
  return { page: Number.isFinite(n) && n >= 1 ? n : 1, size };
}

/** Lee el escalar de un `select({ n: count() })`. */
export function totalDe(filas: { n: number }[]): number {
  return filas[0]?.n ?? 0;
}

/**
 * Paginación en la DB: la ventana y el total salen en paralelo porque con
 * neon-http cada query es un round-trip HTTPS propio.
 *
 * `page` fuera de rango (el filtro cambió y el searchParam no) devolvería una
 * tabla vacía, así que se relee la última página real — un round-trip extra
 * solo en ese caso, para conservar el clamp que hacía `paginar()`.
 */
export async function paginarEnSql<T>(
  { page, size }: Pagina,
  leer: (limit: number, offset: number) => Promise<T[]>,
  contar: () => Promise<number>
): Promise<Paginado<T>> {
  const [items, total] = await Promise.all([leer(size, (page - 1) * size), contar()]);
  const pages = Math.max(1, Math.ceil(total / size));

  if (page <= pages || total === 0) {
    return { items, total, page: Math.min(page, pages), pages };
  }
  return { items: await leer(size, (pages - 1) * size), total, page: pages, pages };
}

/** Paginación en memoria: solo para listas acotadas que ya vienen completas. */
export function paginar<T>(
  rows: T[],
  pageParam: string | undefined,
  size: number = PAGE_SIZE
): Paginado<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pagina(pageParam, size).page, pages);
  return { items: rows.slice((page - 1) * size, page * size), total, page, pages };
}
