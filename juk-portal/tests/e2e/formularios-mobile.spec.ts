import { test, expect, devices, type Page } from "@playwright/test";

import { crearAlumno, crearColegio, seccionFormAlumno } from "./helpers";

/**
 * Los formularios del back-office desde un teléfono. La app nativa va a ser
 * esta misma web dentro de Capacitor, así que "entra en la pantalla" no
 * alcanza: tiene que poder operarse con el pulgar y sin que iOS haga zoom.
 *
 * Corre con el viewport de un Pixel 7 aunque el proyecto sea de escritorio: el
 * `test.use` de acá manda sobre el `use` del proyecto.
 */
test.use({ viewport: devices["Pixel 7"].viewport });

/** Controles cuya fuente mide menos de 16px: Safari iOS hace zoom al enfocarlos. */
async function controlesConLetraChica(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea'
      )
    )
      .filter((el) => el.getClientRects().length > 0)
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => {
        const nombre =
          el.getAttribute("id") ??
          el.getAttribute("aria-label") ??
          el.getAttribute("placeholder") ??
          "?";
        return `${el.tagName.toLowerCase()}[${nombre}]`;
      })
  );
}

test(
  "el alta de alumno se completa y se guarda desde un teléfono, sin zoom",
  { tag: "@mobile" },
  async ({ page }) => {
    await page.goto("/alumnos/nuevo");

    // En el alta el foco arranca puesto: se puede escribir sin tocar nada.
    await expect(
      seccionFormAlumno(page, "Datos personales").getByLabel("Nombre*", { exact: true })
    ).toBeFocused();

    // Facturación (7 campos que casi nunca se cargan) nace plegada.
    await expect(page.getByLabel("Razón social")).toBeHidden();

    expect(await controlesConLetraChica(page)).toEqual([]);

    // El botón principal tiene que ser tapeable de verdad (--tap = 44px).
    const guardar = page.getByRole("button", { name: "Guardar" });
    const caja = await guardar.boundingBox();
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Nada se sale de pantalla: en un teléfono el scroll horizontal rompe el form.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(desborda).toBe(false);

    // Y el alta completa funciona con ese viewport (helper = mismo flujo real).
    const alumno = await crearAlumno(page);
    await expect(page).toHaveURL(/\/alumnos$/);
    await page.getByPlaceholder(/Buscar por nombre/).fill(alumno.apellido);
    await expect(page.getByRole("row").filter({ hasText: alumno.label })).toBeVisible();
  }
);

test(
  "desactivar un colegio pide confirmación y al cancelar no cambia nada",
  { tag: "@mobile" },
  async ({ page }) => {
    const { nombre } = await crearColegio(page);

    await page.getByPlaceholder("Buscar por nombre o ciudad…").fill(nombre);
    const editar = page.getByRole("link", { name: "Editar" });
    await expect(editar).toHaveCount(1);
    await editar.click();
    await page.waitForURL(/\/colegios\/[0-9a-f-]{36}\/editar$/);

    await page.getByRole("button", { name: "Desactivar" }).click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText(`¿Desactivar ${nombre}?`)).toBeVisible();

    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();

    // Nada se guardó: seguimos en la edición y el colegio sigue activo.
    await expect(page).toHaveURL(/\/colegios\/[0-9a-f-]{36}\/editar$/);
    await expect(page.getByRole("button", { name: "Desactivar" })).toBeVisible();
  }
);
