import { eq, inArray } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { inscripciones } from "../../src/lib/db/schema";
import { VARIANTES, type Variante } from "../../src/lib/domain/inscripciones/schema";
import { TEXTO_CONSENTIMIENTO } from "../../src/lib/domain/privacidad/politica";

import { controlesConLetraChica, esperarHidratacion, ocultarOverlayDeDev } from "./helpers";
import {
  completarFichaInscripcion,
  enviarFichaInscripcion,
  sufijoUnico,
  type FichaInscripcion,
} from "./helpers-flujos";

/*
 * Las tres pieles del Application Form (A · Legajo, B · Cuaderno, C · Embarque).
 *
 * LO QUE SE PRUEBA ACÁ ES QUE LA VARIANTE SEA SOLO PIEL. El formulario es uno
 * solo —mismos campos, misma server action, mismas validaciones— y eso deja de
 * ser cierto en silencio: alcanza con que una variante mueva un rótulo adentro
 * del nombre accesible, o que el número decorativo de la sección se cuele en el
 * nombre del grupo, para que una familia con lector de pantalla reciba un
 * formulario distinto según la campaña que le tocó. Por eso el test compara los
 * tres árboles entre sí en vez de verificar un árbol esperado: lo que importa no
 * es cómo se llama cada campo, sino que se llame IGUAL en las tres.
 *
 * Y compara también las pieles: si el CSS dejara de aplicarse (una clase que no
 * llega, un `:has()` que se rompe), las tres colapsarían en una sola y la
 * igualdad accesible pasaría a ser verdadera y vacía. Por eso `pielDelFormulario`
 * tiene que dar tres resultados distintos.
 *
 * El alta con token la cubre `inscripcion-alta.spec.ts`; la bandeja del equipo,
 * `inscripciones-bandeja.spec.ts`. Acá las fichas se envían SIN invitación a
 * propósito: sin token no se crea alumno ni cuenta de familia, así que la
 * limpieza es una sola tabla y el test no compite por el viaje de nadie.
 */

/** Los DNIs que este spec puso en la base. Es la llave de toda la limpieza. */
const dnisCreados: string[] = [];

test.afterAll(async () => {
  if (dnisCreados.length === 0) return;
  // Sin invitación la ficha queda en `requiere_revision` y no crea alumno: no
  // hay nada más que borrar (el alta la prueba `inscripcion-alta.spec.ts`).
  await db.delete(inscripciones).where(inArray(inscripciones.dni, dnisCreados));
});

/**
 * La URL de cada piel, escrita COMPLETA como literal (mismo criterio que la
 * vista previa de `/configuracion`). El `?v=` es el escalón de mayor precedencia
 * de `resolverVariante`, así que es la forma de recorrer las tres sin depender
 * de qué variante esté configurada mientras corre la suite.
 */
const URL_VARIANTE: Record<Variante, string> = {
  a: "/inscripcion?v=a",
  b: "/inscripcion?v=b",
  c: "/inscripcion?v=c",
};

/** Un valor que no es ninguna variante: tiene que caer al escalón siguiente. */
const V_INVALIDA = "no-existe-9427";
const URL_V_INVALIDA = "/inscripcion?v=no-existe-9427";

/**
 * Los campos, por su nombre accesible. La lista se escribe entera y a mano: es
 * el contrato que las tres variantes comparten, y si una lo cambia el test tiene
 * que nombrar el campo que se rompió, no devolver un diff de objetos.
 */
const CAMPOS = [
  "Nombre*",
  "Apellido*",
  "Fecha de nacimiento*",
  "DNI*",
  "Número de pasaporte*",
  "Vencimiento del pasaporte*",
  "Nombre y apellido*",
  "Celular*",
  "Email*",
  "Teléfono del alumno",
  "Email del alumno",
  "Nivel de inglés",
  "Alergias y datos de salud",
  "Preferencias de alojamiento",
] as const;

/**
 * Los títulos de sección. Son el nombre accesible de cada `<fieldset>`: el orden
 * (01, "Parte 1 de 4", el círculo de la parada) se dibuja en un nodo aria-hidden
 * justo para que no entre acá.
 */
const SECCIONES = [
  "Datos del alumno",
  "Pasaporte",
  "Adulto responsable",
  "Contacto y preferencias del alumno",
] as const;

const BOTON_ENVIAR = "Enviar la inscripción";

function dniDeTest(): string {
  const dni = `99${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
  dnisCreados.push(dni);
  return dni;
}

function fichaDeTest(variante: Variante): FichaInscripcion {
  const dni = dniDeTest();
  return {
    nombre: "Ficha",
    apellido: `Piel E2E ${sufijoUnico()}`,
    dni,
    pasaporte: `FV${variante.toUpperCase()}${dni}`,
    // Un email por ficha: el anti-abuso permite 3 envíos por email por hora, y
    // las tres variantes se envían dentro del mismo test.
    tutorEmail: `e2e+piel-${variante}-${dni}@e2e.example.com`,
  };
}

function inscripcionPorDni(dni: string) {
  return db
    .select({ estado: inscripciones.estado, variante: inscripciones.variante })
    .from(inscripciones)
    .where(eq(inscripciones.dni, dni))
    .then((filas) => filas[0]);
}

/** La marca que la page deja en el contenedor: de ahí cuelga toda la piel. */
function marcaDeVariante(page: Page) {
  return page.locator("[data-variante]");
}

type PerfilAccesible = {
  titulo: string;
  grupos: string[];
  campos: string[];
  botones: string[];
};

/**
 * El árbol accesible del formulario, reducido a lo que un lector de pantalla
 * anuncia: el h1, el nombre de cada grupo, el nombre de cada control (con su
 * `name` y su tipo, para que un campo cambiado de lugar se note) y el nombre de
 * cada botón.
 *
 * El nombre se calcula a mano —aria-label, aria-labelledby, <label> asociado—
 * descartando los subárboles `aria-hidden`, que es exactamente lo que hace el
 * navegador. Mismo criterio que `a11y-basico.spec.ts`.
 */
async function perfilAccesible(page: Page): Promise<PerfilAccesible> {
  return page.evaluate(() => {
    const limpio = (texto: string | null | undefined): string =>
      (texto ?? "").replace(/\s+/g, " ").trim();

    const textoAccesible = (el: Element): string => {
      const clon = el.cloneNode(true) as Element;
      for (const decorativo of Array.from(clon.querySelectorAll('[aria-hidden="true"]'))) {
        decorativo.remove();
      }
      return limpio(clon.textContent);
    };

    const nombreDe = (el: Element): string => {
      const propio = el.getAttribute("aria-label");
      if (propio) return limpio(propio);

      const ids = el.getAttribute("aria-labelledby");
      if (ids) {
        return limpio(
          ids
            .split(/\s+/)
            .map((id) => {
              const nodo = document.getElementById(id);
              return nodo ? textoAccesible(nodo) : "";
            })
            .join(" ")
        );
      }

      const label = (el as HTMLInputElement).labels?.[0];
      return label ? textoAccesible(label) : "";
    };

    const controles = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]), select, textarea'
      )
    );

    return {
      titulo: limpio(document.querySelector("h1")?.textContent),
      grupos: Array.from(document.querySelectorAll("fieldset")).map((fieldset) => {
        const legend = fieldset.querySelector("legend");
        return legend ? textoAccesible(legend) : "(sin legend)";
      }),
      campos: controles.map(
        (control) =>
          `${control.tagName.toLowerCase()}[${control.getAttribute("name") ?? "—"}:${control.type}] → ${nombreDe(control)}`
      ),
      botones: Array.from(document.querySelectorAll("button")).map(
        (boton) => nombreDe(boton) || textoAccesible(boton)
      ),
    };
  });
}

/**
 * La firma visual del formulario. No describe el diseño: solo alcanza para
 * distinguir una piel de otra (el papel, su radio y el lomo del cuaderno son
 * justo lo que las tres resuelven distinto).
 */
async function pielDelFormulario(page: Page): Promise<string> {
  return page.locator("form").evaluate((form) => {
    const cs = getComputedStyle(form);
    return [cs.backgroundColor, cs.borderRadius, cs.borderLeftWidth, cs.boxShadow].join(" · ");
  });
}

test.describe("el formulario público con sus tres pieles", () => {
  // La familia entra sin sesión: `browser.newContext()` heredaría la del
  // proyecto (admin), y el formulario tiene que verse igual para cualquiera.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("las tres exponen el mismo árbol accesible y los mismos errores", async ({ page }) => {
    test.setTimeout(150_000);

    const muestras: Array<{
      variante: Variante;
      perfil: PerfilAccesible;
      piel: string;
      errores: string;
    }> = [];

    for (const variante of VARIANTES) {
      await page.goto(URL_VARIANTE[variante]);
      await expect(marcaDeVariante(page)).toHaveAttribute("data-variante", variante);

      // Por nombre, uno por uno: así el fallo dice QUÉ campo se rompió y en cuál
      // de las tres. `exact` porque "Email*" y "Email del alumno" conviven.
      for (const campo of CAMPOS) {
        await expect(
          page.getByLabel(campo, { exact: true }),
          `«${campo}» en la variante ${variante}`
        ).toHaveCount(1);
      }
      for (const seccion of SECCIONES) {
        await expect(
          page.getByRole("group", { name: seccion, exact: true }),
          `la sección «${seccion}» en la variante ${variante}`
        ).toHaveCount(1);
      }
      await expect(page.getByRole("checkbox", { name: TEXTO_CONSENTIMIENTO })).toHaveCount(1);
      await expect(page.getByRole("button", { name: BOTON_ENVIAR })).toBeVisible();

      const perfil = await perfilAccesible(page);
      const piel = await pielDelFormulario(page);

      // Los mensajes de error también son parte del contrato: el mismo
      // formulario vacío tiene que devolver la misma lista. El envío no gasta
      // cuota de anti-abuso — la validación falla antes de contarlo.
      const enviar = page.getByRole("button", { name: BOTON_ENVIAR });
      await esperarHidratacion(enviar);
      await enviar.click();

      const resumen = page.getByRole("alert");
      await expect(resumen).toBeVisible({ timeout: 60_000 });
      const errores = (await resumen.innerText()).replace(/\s+/g, " ").trim();

      muestras.push({ variante, perfil, piel, errores });
    }

    const [a, b, c] = muestras;
    if (!a || !b || !c) throw new Error("no se recorrieron las tres variantes");

    expect(b.perfil, "B · Cuaderno cambió el árbol accesible").toEqual(a.perfil);
    expect(c.perfil, "C · Embarque cambió el árbol accesible").toEqual(a.perfil);
    expect(b.errores, "B · Cuaderno cambió los mensajes de error").toBe(a.errores);
    expect(c.errores, "C · Embarque cambió los mensajes de error").toBe(a.errores);

    // El título de la sección y nada más: el orden (01 / "Parte 1 de 4" / la
    // parada) se dibuja en un nodo aria-hidden. Si se colara, el grupo se
    // llamaría distinto en cada variante y las comparaciones de arriba fallarían
    // sin decir por qué.
    expect(a.perfil.grupos).toEqual([...SECCIONES]);

    // …y sin embargo son tres pieles distintas. Sin esto, un CSS que dejó de
    // aplicarse haría pasar todo el test sin que quede nada que probar.
    expect(
      new Set([a.piel, b.piel, c.piel]).size,
      `las tres pieles tienen que verse distintas: ${[a, b, c].map((m) => `${m.variante}=${m.piel}`).join(" | ")}`
    ).toBe(3);
  });

  test("el envío funciona igual en las tres y la ficha registra la piel que se vio", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    for (const variante of VARIANTES) {
      const ficha = fichaDeTest(variante);

      await page.goto(URL_VARIANTE[variante]);
      await expect(marcaDeVariante(page)).toHaveAttribute("data-variante", variante);
      await ocultarOverlayDeDev(page);

      await completarFichaInscripcion(page, ficha);
      const codigo = await enviarFichaInscripcion(page);
      expect(codigo, `el acuse de la variante ${variante}`).toMatch(/^INS-\d{6,}$/);

      // Lo que se registra es la variante que la familia EFECTIVAMENTE vio: el
      // formulario la reenvía en un campo oculto y la action la vuelve a
      // resolver. Es el dato con el que después se compara cuál convierte.
      const guardada = await inscripcionPorDni(ficha.dni);
      expect(guardada?.variante, `la ficha cargada con la variante ${variante}`).toBe(variante);
      // Sin invitación la compuerta no se abre, en las tres por igual.
      expect(guardada?.estado).toBe("requiere_revision");
    }
  });

  test(
    "@mobile a 375px ninguna piel achica los controles ni scrollea de costado",
    async ({ page }) => {
      test.setTimeout(150_000);
      // 375px es el ancho del iPhone SE/8: más angosto que el Pixel 7 del
      // proyecto "mobile" y el piso real de las familias. La piel C es la que
      // más se juega acá (paradas con sangría y círculo absoluto), pero las tres
      // tienen que aguantarlo.
      await page.setViewportSize({ width: 375, height: 812 });

      for (const variante of VARIANTES) {
        await page.goto(URL_VARIANTE[variante]);
        await expect(marcaDeVariante(page)).toHaveAttribute("data-variante", variante);
        await ocultarOverlayDeDev(page);

        expect(
          await controlesConLetraChica(page),
          `controles con letra menor a 16px en la variante ${variante} (iOS haría zoom)`
        ).toEqual([]);

        const enviar = page.getByRole("button", { name: BOTON_ENVIAR });
        const caja = await enviar.boundingBox();
        if (!caja) throw new Error(`el botón de enviar no se renderizó en la variante ${variante}`);
        expect(caja.height, `alto del botón de enviar en la variante ${variante}`).toBeGreaterThanOrEqual(44);
        expect(caja.x).toBeGreaterThanOrEqual(0);
        expect(caja.x + caja.width).toBeLessThanOrEqual(375);

        // El otro objetivo táctil del formulario: el input del consentimiento
        // mide 20px, lo que se tapea es el <label> que lo envuelve.
        const consentimiento = page
          .getByRole("checkbox", { name: TEXTO_CONSENTIMIENTO })
          .locator("xpath=ancestor::label[1]");
        const cajaConsentimiento = await consentimiento.boundingBox();
        if (!cajaConsentimiento) {
          throw new Error(`el consentimiento no se renderizó en la variante ${variante}`);
        }
        expect(
          cajaConsentimiento.height,
          `alto del consentimiento en la variante ${variante}`
        ).toBeGreaterThanOrEqual(44);

        const desborda = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(desborda, `la variante ${variante} no debe scrollear horizontalmente`).toBe(false);
      }
    }
  );
});

test("la variante de /configuracion manda, y la del link la pisa", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);

  // El `page` es la sesión de admin del proyecto: el setting se cambia desde la
  // pantalla real del equipo, que es la única forma de saber que el selector
  // llega hasta el formulario público.
  await page.goto("/configuracion");
  const panel = page.locator("[data-config-formulario]");
  const selector = panel.getByLabel("Variante activa");
  await esperarHidratacion(selector);

  /**
   * Deja guardada una variante desde la pantalla del equipo, y recarga para
   * confirmar que llegó a la fila de `configuracion`: el toast solo dice que la
   * action contestó, y de este guardado depende que el setting quede restaurado.
   */
  async function guardarVariante(valor: string): Promise<void> {
    await selector.selectOption(valor);
    await panel.getByRole("button", { name: "Guardar variante" }).click();
    await expect(page.getByText("Variante del formulario guardada.")).toBeVisible();

    await page.reload();
    await esperarHidratacion(selector);
    await expect(selector).toHaveValue(valor);
  }

  // Lo que el equipo tenga elegido hoy: se restaura pase lo que pase, porque es
  // configuración compartida y la base de desarrollo tiene datos reales.
  const elegidaAntes = await selector.inputValue();

  try {
    await guardarVariante("b");

    const contexto = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const familia = await contexto.newPage();

      // Sin link y sin parámetro: manda el setting.
      await familia.goto("/inscripcion");
      await expect(marcaDeVariante(familia)).toHaveAttribute("data-variante", "b");

      // El parámetro del link es el escalón de mayor precedencia.
      await familia.goto(URL_VARIANTE.c);
      await expect(marcaDeVariante(familia)).toHaveAttribute("data-variante", "c");

      // Y un `?v=` que no es ninguna variante cae al escalón siguiente (el
      // setting) sin romper la página: el formulario se sigue pudiendo enviar.
      await familia.goto(URL_V_INVALIDA);
      await expect(marcaDeVariante(familia)).toHaveAttribute("data-variante", "b");
      await expect(familia.getByRole("button", { name: BOTON_ENVIAR })).toBeVisible();
      await expect(familia.getByLabel("DNI*")).toHaveCount(1);

      // El valor del querystring no se refleja en ninguna parte de la pantalla:
      // es texto que escribe quien manda el link.
      expect(await familia.locator("body").innerText()).not.toContain(V_INVALIDA);
    } finally {
      await contexto.close();
    }
  } finally {
    await guardarVariante(elegidaAntes);
  }
});
