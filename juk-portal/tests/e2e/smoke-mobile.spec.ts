import { test, expect, type Page } from "@playwright/test";

/*
 * Smoke de teléfono. Corre en el proyecto "mobile" (Pixel 7, touch) — el tag
 * @mobile es lo que lo selecciona, y por eso el proyecto "chromium" lo ignora
 * con grepInvert.
 *
 * Dos cosas, las que arruinan la experiencia con el pulgar antes que ninguna:
 *   1. que la página no scrollee de costado (scrollWidth <= innerWidth);
 *   2. que no haya texto por debajo de 12px en el contenido principal.
 *
 * Ambos chequeos listan los elementos culpables, no solo el número.
 */

const MINIMO_LEGIBLE = 12;
// El root está en 14px (src/styles/globals.css), así que --t-label (0.86rem)
// da 12.04px: hay que comparar con margen o el redondeo lo marca como falla.
const EPSILON = 0.15;

async function medirOverflow(page: Page) {
  return page.evaluate(() => {
    const ancho = window.innerWidth;
    const scroll = document.documentElement.scrollWidth;

    // Si un ancestro recorta o scrollea en horizontal (tabla con overflow-x,
    // carrusel, contenedor overflow-hidden), lo que se pase de ancho adentro
    // NO hace scrollear la página: no es culpable.
    const contenidoPorAncestro = (el: Element): boolean => {
      let nodo: Element | null = el.parentElement;
      while (nodo && nodo !== document.body) {
        const overflowX = window.getComputedStyle(nodo).overflowX;
        if (overflowX !== "visible") return true;
        nodo = nodo.parentElement;
      }
      return false;
    };

    const ruta = (el: Element): string => {
      const partes: string[] = [];
      let nodo: Element | null = el;
      while (nodo && nodo !== document.body && partes.length < 4) {
        const tag = nodo.tagName.toLowerCase();
        if (nodo.id) {
          partes.unshift(`${tag}#${nodo.id}`);
          break;
        }
        partes.unshift(tag);
        nodo = nodo.parentElement;
      }
      return partes.join(" > ");
    };

    const culpables: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (culpables.length >= 10) break;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= ancho + 1 && r.left >= -1) continue;
      if (contenidoPorAncestro(el)) continue;
      const texto = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
      culpables.push(
        `${ruta(el)} — izq ${Math.round(r.left)}px, der ${Math.round(r.right)}px${texto ? ` «${texto}»` : ""}`
      );
    }

    return { ancho, scroll, culpables };
  });
}

async function medirTextoChico(page: Page, minimo: number) {
  return page.evaluate((min) => {
    const main = document.querySelector("main") ?? document.body;

    const ruta = (el: Element): string => {
      const partes: string[] = [];
      let nodo: Element | null = el;
      while (nodo && nodo !== document.body && partes.length < 4) {
        const tag = nodo.tagName.toLowerCase();
        if (nodo.id) {
          partes.unshift(`${tag}#${nodo.id}`);
          break;
        }
        partes.unshift(tag);
        nodo = nodo.parentElement;
      }
      return partes.join(" > ");
    };

    const chicos: string[] = [];
    for (const el of Array.from(main.querySelectorAll("*"))) {
      if (chicos.length >= 20) break;
      if (el.closest('[aria-hidden="true"]')) continue;

      const propio = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      // <= 2 caracteres es iconografía o iniciales de avatar: decorativo.
      if (propio.length <= 2) continue;

      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (el.getClientRects().length === 0) continue;

      const px = Number.parseFloat(cs.fontSize);
      if (!Number.isFinite(px) || px >= min) continue;
      chicos.push(`${ruta(el)} — ${px.toFixed(1)}px «${propio.slice(0, 40)}»`);
    }
    return chicos;
  }, minimo);
}

async function revisarPantalla(page: Page, ruta: string) {
  await page.goto(ruta);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  const { ancho, scroll, culpables } = await medirOverflow(page);
  const detalle = culpables.length > 0 ? `\n  · ${culpables.join("\n  · ")}` : "\n  (sin candidato obvio: revisá anchos fijos, min-width o white-space)";
  expect(
    scroll,
    `${ruta} scrollea de costado: scrollWidth ${scroll}px > viewport ${ancho}px. Elementos que se pasan:${detalle}`
  ).toBeLessThanOrEqual(ancho + 1);

  const chicos = await medirTextoChico(page, MINIMO_LEGIBLE - EPSILON);
  expect(chicos, `${ruta} tiene texto por debajo de ${MINIMO_LEGIBLE}px en el contenido principal:`).toEqual(
    []
  );
}

test.describe("smoke mobile", { tag: "@mobile" }, () => {
  for (const ruta of ["/dashboard", "/alumnos", "/viajes"]) {
    test(`${ruta} entra en el ancho del teléfono y se lee`, async ({ page }) => {
      test.setTimeout(90_000);
      await revisarPantalla(page, ruta);
    });
  }
});

test.describe("smoke mobile — portal de familias", { tag: "@mobile" }, () => {
  // Sesión de familia (la arma familia.setup.ts, del que depende el proyecto
  // "mobile" en playwright.config.ts). El alumno DEMO-1 lo siembra db:seed:demo.
  test.use({ storageState: "tests/e2e/.auth/familia.json" });

  test("/familias/DEMO-1 entra en el ancho del teléfono y se lee", async ({ page }) => {
    test.setTimeout(90_000);
    await revisarPantalla(page, "/familias/DEMO-1");
  });
});
