import { describe, expect, it, vi } from "vitest";

import { PAGE_SIZE, pagina, paginar, paginarEnSql, totalDe } from "./paginate";

const filas = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("pagina", () => {
  it("vacío, no numérico, cero, negativo o infinito caen en la página 1", () => {
    for (const param of [undefined, "", "abc", "0", "-3", "Infinity"]) {
      expect(pagina(param)).toEqual({ page: 1, size: PAGE_SIZE });
    }
  });

  it("redondea hacia abajo y respeta un tamaño propio", () => {
    expect(pagina("3")).toEqual({ page: 3, size: 50 });
    expect(pagina("2.7", 10)).toEqual({ page: 2, size: 10 });
  });
});

describe("totalDe", () => {
  it("lee el count o 0 si la query no devolvió filas", () => {
    expect(totalDe([{ n: 7 }])).toBe(7);
    expect(totalDe([])).toBe(0);
  });
});

describe("paginarEnSql", () => {
  function fuente(total: number) {
    const datos = filas(total);
    const leer = vi.fn((limit: number, offset: number) =>
      Promise.resolve(datos.slice(offset, offset + limit))
    );
    const contar = vi.fn(() => Promise.resolve(total));
    return { leer, contar };
  }

  it("pide la ventana con limit/offset de la página", async () => {
    const { leer, contar } = fuente(120);
    const r = await paginarEnSql({ page: 2, size: 50 }, leer, contar);
    expect(leer).toHaveBeenCalledTimes(1);
    expect(leer).toHaveBeenCalledWith(50, 50);
    expect(contar).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ items: filas(100).slice(50), total: 120, page: 2, pages: 3 });
  });

  it("página fuera de rango: relee la última página real en vez de mostrar una tabla vacía", async () => {
    const { leer, contar } = fuente(120);
    const r = await paginarEnSql({ page: 99, size: 50 }, leer, contar);
    expect(leer).toHaveBeenCalledTimes(2);
    expect(leer).toHaveBeenLastCalledWith(50, 100);
    expect(r.page).toBe(3);
    expect(r.items).toEqual(filas(120).slice(100));
  });

  it("total múltiplo exacto del tamaño no inventa una página vacía", async () => {
    const { leer, contar } = fuente(100);
    const r = await paginarEnSql({ page: 3, size: 50 }, leer, contar);
    expect(r.pages).toBe(2);
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(50);
  });

  it("sin resultados no relee: una página, vacía", async () => {
    const { leer, contar } = fuente(0);
    const r = await paginarEnSql({ page: 5, size: 50 }, leer, contar);
    expect(leer).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ items: [], total: 0, page: 1, pages: 1 });
  });
});

describe("paginar (en memoria)", () => {
  it("corta la página pedida", () => {
    const r = paginar(filas(120), "2");
    expect(r.items).toEqual(filas(100).slice(50));
    expect(r).toMatchObject({ total: 120, page: 2, pages: 3 });
  });

  it("una página mayor a la última se acota a la última", () => {
    const r = paginar(filas(120), "99");
    expect(r.page).toBe(3);
    expect(r.items).toEqual(filas(120).slice(100));
  });

  it("params inválidos caen en la página 1", () => {
    for (const param of [undefined, "abc", "0", "-3"]) {
      expect(paginar(filas(120), param).page).toBe(1);
    }
  });

  it("una página fraccionaria no produce una ventana corrida", () => {
    const r = paginar(filas(120), "1.5");
    expect(r.page).toBe(1);
    expect(r.items).toEqual(filas(50));
  });

  it("lista vacía: una página sin items", () => {
    expect(paginar([], "3")).toEqual({ items: [], total: 0, page: 1, pages: 1 });
  });

  it("respeta un tamaño propio y el múltiplo exacto", () => {
    expect(paginar(filas(25), "3", 10).items).toEqual([20, 21, 22, 23, 24]);
    expect(paginar(filas(100), undefined).pages).toBe(2);
  });
});
