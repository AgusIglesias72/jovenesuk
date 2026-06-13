export const PAGE_SIZE = 50;

export type Paginado<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};

/** Paginación server-side por searchParam `page` (tablas de 50 filas). */
export function paginar<T>(
  rows: T[],
  pageParam: string | undefined,
  size: number = PAGE_SIZE
): Paginado<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pages);
  return { items: rows.slice((page - 1) * size, page * size), total, page, pages };
}
