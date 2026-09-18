import { expect, test, type Locator, type Page } from "@playwright/test";

import { TEXTO_CONSENTIMIENTO } from "../../src/lib/domain/privacidad/politica";

import { esperarHidratacion, ocultarOverlayDeDev } from "./helpers";

/*
 * Validación en vivo del Application Form (/inscripcion).
 *
 * Lo que se prueba es el CRITERIO, que es lo que pidió el dueño: mientras
 * alguien completa un campo por primera vez no se le grita, pero un carácter
 * imposible —una letra en el DNI— se marca en el acto, sin esperar al envío.
 *
 * Ninguna de estas fichas se envía: la validación corre entera en el navegador,
 * así que el spec no escribe una sola fila y no tiene teardown. Que el server
 * rechace lo mismo lo cubre `src/app/inscripcion/actions.test.ts`.
 *
 * La familia entra SIN SESIÓN: `browser.newContext()` heredaría la del proyecto.
 */

const MENSAJE_DNI = "El DNI va solo con números.";
const MENSAJE_EMAIL = "Revisá el email: parece que le falta el @ o el dominio.";
const MENSAJE_FECHA = "Esa fecha no existe. Va DD/MM/AAAA.";

/**
 * El error que la familia VE: el `<span role="alert">` que `Field` cuelga del
 * control.
 *
 * Va por texto EXACTO porque el mismo mensaje aparece dos veces en la página:
 * también en la región viva (sr-only), que lo repite con el nombre del campo
 * adelante ("DNI: El DNI va solo con números."). `getByText` matchea por
 * substring, así que sin `exact` el locator resuelve a los dos elementos y el
 * modo estricto de Playwright corta el test.
 */
function errorVisible(page: Page, mensaje: string): Locator {
  return page.getByText(mensaje, { exact: true });
}

/**
 * Lo que la región viva le dicta al lector de pantalla. El nombre del campo
 * adelante es lo que hace entendible un anuncio suelto —y es también lo único
 * que distingue a esta región del error visible—, así que el texto completo la
 * identifica sin un selector CSS ni una clase.
 */
function anunciado(page: Page, campo: string, mensaje: string): Locator {
  return page.getByText(`${campo}: ${mensaje}`, { exact: true });
}

test.describe("el formulario público avisa mientras se completa", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/inscripcion");
    await ocultarOverlayDeDev(page);
    await esperarHidratacion(page.getByLabel("DNI*"));
  });

  test("@mobile una letra en el DNI se marca en el acto, y se borra sola al corregirla", async ({
    page,
  }) => {
    const dni = page.getByLabel("DNI*");

    // Mientras escribe números no pasa nada: un DNI a medio tipear no es un
    // error. Los seis dígitos son el mínimo del schema: al borrar la letra, lo
    // que queda tiene que ser un DNI válido para que el error se limpie solo.
    //
    // El locator va por substring a propósito (sin `errorVisible`): así el 0
    // cubre las DOS apariciones posibles del mensaje, la visible y la que
    // anunciaría el lector de pantalla. Todavía no se dijo nada, en ningún lado.
    await dni.pressSequentially("451023");
    await expect(page.getByText(MENSAJE_DNI)).toHaveCount(0);
    await expect(dni).not.toHaveAttribute("aria-invalid", "true");

    // La letra sí: sin salir del campo y sin enviar nada.
    await dni.pressSequentially("a");
    await expect(errorVisible(page, MENSAJE_DNI)).toBeVisible();
    await expect(dni).toHaveAttribute("aria-invalid", "true");

    // Y quien no ve la pantalla también se entera: la región viva del
    // formulario lo anuncia con el nombre del campo adelante. Es un aserto
    // propio porque es otra garantía —el error marcado se puede ver sin que
    // nada lo diga—, y la región es `polite`: espera a que la persona termine
    // de hablar en vez de interrumpirla en cada tecla.
    await expect(anunciado(page, "DNI", MENSAJE_DNI)).toHaveCount(1);

    // Y el foco NO se mueve: validar mientras se escribe no puede robar el cursor.
    await expect(dni).toBeFocused();

    // Premio inmediato: borrar la letra limpia el error sin esperar al blur, y
    // lo limpia en los dos lados (de nuevo, el locator por substring).
    await dni.press("Backspace");
    await expect(page.getByText(MENSAJE_DNI)).toHaveCount(0);
    await expect(dni).not.toHaveAttribute("aria-invalid", "true");
  });

  test("el control marcado queda en rojo y su mensaje lo describe", async ({ page }) => {
    const dni = page.getByLabel("DNI*");
    await dni.fill("45102a");
    await expect(errorVisible(page, MENSAJE_DNI)).toBeVisible();

    // El borde rojo salía de `invalid`, que este formulario no pasaba: el
    // control quedaba igual de gris con el error escrito debajo.
    const borde = await dni.evaluate((el) => getComputedStyle(el).borderTopColor);
    const bordeNormal = await page
      .getByLabel("Apellido*", { exact: true })
      .evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(borde, "el campo marcado tiene que verse distinto del resto").not.toBe(bordeNormal);

    // Y el mensaje es la descripción del control, no un texto suelto al lado.
    const describedBy = await dni.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    // Por atributo y no por `#id`: los ids de `useId` traen caracteres que un
    // selector CSS no acepta.
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(MENSAJE_DNI);
  });

  test("el email se marca recién al salir del campo, no mientras se escribe", async ({
    page,
  }) => {
    const email = page.getByLabel("Email*", { exact: true });

    // "vanina@" está a medio escribir: nadie quiere que le digan que está mal
    // antes de terminar. El locator por substring cubre las dos apariciones
    // posibles: ni se marca en pantalla ni se anuncia al lector.
    await email.pressSequentially("vanina@");
    await expect(page.getByText(MENSAJE_EMAIL)).toHaveCount(0);

    await email.blur();
    await expect(errorVisible(page, MENSAJE_EMAIL)).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");

    await email.fill("vanina@example.com");
    await expect(page.getByText(MENSAJE_EMAIL)).toHaveCount(0);
  });

  test("una fecha a medio tipear dice que la fecha no existe, no que falta", async ({ page }) => {
    // El valor real de <DateInput> vive en un input oculto que queda VACÍO
    // mientras la fecha esté incompleta: sin el rodeo, el aviso diría "Ingresá
    // la fecha de nacimiento" con el campo lleno a la vista.
    const visible = page.getByLabel("Fecha (DD/MM/AAAA)").first();
    await visible.pressSequentially("1205201");
    await visible.blur();

    await expect(errorVisible(page, MENSAJE_FECHA)).toBeVisible();
    // Y en ningún lado —ni marcado ni anunciado— el mensaje de "falta".
    await expect(page.getByText("Ingresá la fecha de nacimiento")).toHaveCount(0);
  });

  test("un pasaporte vencido avisa, pero no marca el campo ni frena el envío", async ({
    page,
  }) => {
    const vencimiento = page.getByLabel("Vencimiento del pasaporte*");
    await vencimiento.fill("2020-01-01");
    await vencimiento.blur();

    await expect(
      page.getByText("Ese pasaporte ya está vencido: hay que renovarlo antes del viaje.")
    ).toBeVisible();
    // Es un AVISO: la familia que está renovando el pasaporte tiene que poder
    // mandar la ficha igual.
    await expect(vencimiento).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("button", { name: "Enviar la inscripción" })).toBeEnabled();
  });

  test("el consentimiento no se pinta en rojo por tabular fuera sin tildarlo", async ({
    page,
  }) => {
    // Quien todavía está leyendo la política no hizo nada mal. El
    // consentimiento se marca solo cuando el envío falla.
    const consentimiento = page.getByRole("checkbox", { name: TEXTO_CONSENTIMIENTO });
    await consentimiento.focus();
    await consentimiento.blur();

    await expect(consentimiento).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Tenés que aceptar para continuar")).toHaveCount(0);
  });

  test("el honeypot no se valida ni se marca nunca", async ({ page }) => {
    // Marcarlo le enseñaría al bot qué lo delata.
    const honeypot = page.locator('input[name="website"]');
    await honeypot.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "https://spam.example";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    await expect(honeypot).not.toHaveAttribute("aria-invalid", "true");

    // La cuenta se toma DENTRO del formulario, que es donde viven los dos
    // `role="alert"` del producto: el error de cada campo y el resumen del
    // envío fallido. Fuera del form hay uno más, ajeno y siempre presente —el
    // anunciador de rutas de Next (`__next-route-announcer__`, vacío)—, que un
    // `page.getByRole("alert")` contaba como si fuera un error de la ficha.
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  });
});
