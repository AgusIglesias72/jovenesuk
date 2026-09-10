import { test, expect, type Page } from "@playwright/test";

/*
 * Accesibilidad básica, sin dependencias.
 *
 * Es un reemplazo TEMPORAL de axe: `@axe-core/playwright` no está instalado y
 * no se puede sumar una dependencia ahora. Cubre a mano las cinco reglas que
 * más rompen en este portal (nombres accesibles, un solo h1, alt, foco
 * visible). Cuando se pueda instalar axe, este archivo se reemplaza por
 * `new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"])` fallando en
 * violaciones serious/critical — la cobertura de axe es muy superior.
 *
 * Los mensajes de error listan el elemento culpable (ruta en el DOM + atributos
 * + texto), no un "falló y arreglate".
 */

type Hallazgo = { regla: string; detalle: string };

declare global {
  interface Window {
    /** La deja el chequeo de foco en la página para no duplicar la lógica entre evaluates. */
    __jukFirmaFoco?: (el: Element) => string;
  }
}

/** Rutas con sesión de admin (las corre el proyecto "chromium"). */
const RUTAS_ADMIN = ["/dashboard", "/alumnos", "/alumnos/nuevo"] as const;

/** Rutas sin sesión: el portal público y el login. */
const RUTAS_PUBLICAS = ["/", "/login"] as const;

/**
 * Reglas (a)-(d): se resuelven en una sola pasada por el DOM ya renderizado.
 *
 * Nombre accesible = aria-label | aria-labelledby | <label> asociado | title
 * (el placeholder NO alcanza: se va apenas escribís y no lo lee todo el mundo).
 */
async function auditarDom(page: Page): Promise<Hallazgo[]> {
  return page.evaluate(() => {
    const hallazgos: Array<{ regla: string; detalle: string }> = [];

    const recorte = (s: string, n = 48): string =>
      s.replace(/\s+/g, " ").trim().slice(0, n);

    const esVisible = (el: Element): boolean => {
      if (el.closest('[aria-hidden="true"]')) return false;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      return el.getClientRects().length > 0;
    };

    /** Ruta corta en el DOM, para poder encontrar el elemento en el código. */
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

    const atributos = (el: Element): string => {
      const pares: string[] = [];
      for (const attr of ["type", "name", "placeholder", "href", "src"]) {
        const v = el.getAttribute(attr);
        if (v) pares.push(`${attr}="${recorte(v, 40)}"`);
      }
      const texto = recorte(el.textContent ?? "", 32);
      if (texto) pares.push(`texto=«${texto}»`);
      return pares.length > 0 ? ` [${pares.join(" ")}]` : "";
    };

    const desdeAriaLabelledby = (el: Element): string => {
      const ids = el.getAttribute("aria-labelledby");
      if (!ids) return "";
      return ids
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
    };

    const nombreDirecto = (el: Element): string => {
      const label = el.getAttribute("aria-label");
      if (label && label.trim()) return label.trim();
      const porId = desdeAriaLabelledby(el);
      if (porId) return porId;
      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim();
      return "";
    };

    /* ── (a) controles de formulario ─────────────────────────────────── */
    const SIN_LABEL_PROPIO = ["hidden", "submit", "button", "reset", "image"];
    const controles = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea"
      )
    );
    for (const control of controles) {
      const tipo = (control.getAttribute("type") ?? "").toLowerCase();
      // Los <input type="submit|button|image"> se auditan como botones.
      if (control.tagName === "INPUT" && SIN_LABEL_PROPIO.includes(tipo)) continue;
      if (!esVisible(control)) continue;

      const etiquetas = Array.from(control.labels ?? []).map((l) => (l.textContent ?? "").trim());
      const nombre = nombreDirecto(control) || etiquetas.find((t) => t.length > 0) || "";
      if (nombre) continue;

      const pista = control.getAttribute("placeholder")
        ? " (solo tiene placeholder, que no cuenta como nombre accesible)"
        : "";
      hallazgos.push({
        regla: "control-sin-nombre",
        detalle: `${ruta(control)}${atributos(control)} — sin <label> asociado, aria-label ni aria-labelledby${pista}`,
      });
    }

    /* ── (b) botones, links e íconos clickeables ─────────────────────── */
    const clickeables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, summary, a[href], input[type="submit"], input[type="button"], input[type="image"], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"]'
      )
    );
    for (const el of clickeables) {
      if (!esVisible(el)) continue;

      const clon = el.cloneNode(true) as HTMLElement;
      for (const oculto of Array.from(clon.querySelectorAll('[aria-hidden="true"]'))) {
        oculto.remove();
      }
      const texto = (clon.textContent ?? "").trim();
      const alts = Array.from(el.querySelectorAll("img"))
        .map((img) => img.getAttribute("alt") ?? "")
        .join(" ")
        .trim();
      const valor = el instanceof HTMLInputElement ? el.value.trim() : "";
      const nombre = nombreDirecto(el) || texto || alts || valor;
      if (nombre) continue;

      hallazgos.push({
        regla: "clickeable-sin-nombre",
        detalle: `${ruta(el)}${atributos(el)} — sin texto visible, aria-label ni alt: un lector de pantalla lo anuncia vacío`,
      });
    }

    /* ── (c) exactamente un h1 ───────────────────────────────────────── */
    const h1s = Array.from(document.querySelectorAll("h1")).filter(esVisible);
    if (h1s.length !== 1) {
      const cuales = h1s.map((h) => `«${recorte(h.textContent ?? "")}»`).join(", ") || "ninguno";
      hallazgos.push({
        regla: "h1",
        detalle: `hay ${h1s.length} <h1> visibles (${cuales}); tiene que haber exactamente 1`,
      });
    }

    /* ── (d) imágenes con alt (vacío si son decorativas) ─────────────── */
    for (const img of Array.from(document.querySelectorAll("img"))) {
      if (img.closest('[aria-hidden="true"]')) continue;
      if (img.hasAttribute("alt")) continue;
      hallazgos.push({
        regla: "img-sin-alt",
        detalle: `${ruta(img)}${atributos(img)} — falta el atributo alt (usá alt="" si es decorativa)`,
      });
    }

    return hallazgos;
  });
}

/**
 * Regla (e): el foco tiene que verse.
 *
 * Se marca cada candidato y se guarda su "firma" visual (outline, anillo,
 * borde, fondo, color, subrayado) ANTES de tocar nada, y recién ahí se tabula
 * de verdad con el teclado (`:focus-visible` solo matchea con foco por teclado)
 * comparando contra esa línea de base. La firma incluye al elemento, sus dos
 * ancestros y los hijos directos de cada uno: el anillo puede dibujarlo el
 * contenedor (DateInput) o un hermano (el Checkbox lo pinta con peer-*).
 * Si no cambia NADA, el foco es invisible.
 */
const PROPS_FOCO = [
  "outline-style",
  "outline-width",
  "outline-color",
  "outline-offset",
  "box-shadow",
  "border-color",
  "border-width",
  "background-color",
  "color",
  "text-decoration-line",
];

async function auditarFoco(page: Page, pasos = 14): Promise<Hallazgo[]> {
  const base = await page.evaluate((props) => {
    const firma = (el: Element): string =>
      props.map((p) => window.getComputedStyle(el).getPropertyValue(p)).join("|");

    const cadena = (el: Element): string => {
      const firmas: string[] = [];
      let nodo: Element | null = el;
      for (let i = 0; i < 3 && nodo; i++) {
        firmas.push(firma(nodo), ...Array.from(nodo.children).map(firma));
        nodo = nodo.parentElement;
      }
      return firmas.join("//");
    };
    window.__jukFirmaFoco = cadena;

    const candidatos = Array.from(
      document.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, summary, [tabindex]"
      )
    ).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.getAttribute("tabindex") === "-1") return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      return el.getClientRects().length > 0;
    });

    return candidatos.map((el, i) => {
      el.setAttribute("data-foco-base", String(i));
      return cadena(el);
    });
  }, PROPS_FOCO);

  const hallazgos: Hallazgo[] = [];
  const vistos = new Set<number>();

  for (let i = 0; i < pasos; i++) {
    await page.keyboard.press("Tab");
    const activo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || el === document.body) return null;
      const idx = el.getAttribute("data-foco-base");
      const cadena = window.__jukFirmaFoco;
      if (idx === null || !cadena) return null;

      const texto = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
      const etiqueta = el.getAttribute("aria-label") ?? el.getAttribute("name") ?? "";
      return {
        idx: Number(idx),
        cadena: cadena(el),
        descripcion: `${el.tagName.toLowerCase()}${etiqueta ? `[${etiqueta}]` : ""}${texto ? ` «${texto}»` : ""}`,
      };
    });
    if (!activo) continue;
    if (vistos.has(activo.idx)) break; // dio la vuelta completa
    vistos.add(activo.idx);

    if (base[activo.idx] === activo.cadena) {
      hallazgos.push({
        regla: "foco-invisible",
        detalle: `${activo.descripcion} — al enfocarlo con Tab no cambia nada visible (ni outline, ni anillo, ni borde, ni en el contenedor): outline:none sin alternativa`,
      });
    }
  }
  return hallazgos;
}

function formatear(hallazgos: Hallazgo[]): string[] {
  return hallazgos.map((h) => `[${h.regla}] ${h.detalle}`);
}

async function auditar(page: Page, ruta: string) {
  await page.goto(ruta);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  const hallazgos = [...(await auditarDom(page)), ...(await auditarFoco(page))];
  expect(formatear(hallazgos), `Accesibilidad básica en ${ruta}`).toEqual([]);
}

test.describe("accesibilidad básica (admin)", () => {
  for (const ruta of RUTAS_ADMIN) {
    test(`${ruta} pasa los chequeos básicos de accesibilidad`, async ({ page }) => {
      test.setTimeout(90_000);
      await auditar(page, ruta);
    });
  }
});

test.describe("accesibilidad básica (sin sesión)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const ruta of RUTAS_PUBLICAS) {
    test(`${ruta} pasa los chequeos básicos de accesibilidad`, async ({ page }) => {
      test.setTimeout(90_000);
      await auditar(page, ruta);
    });
  }
});
