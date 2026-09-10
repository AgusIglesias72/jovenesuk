import { test, expect } from "@playwright/test";

import {
  asignarAlumnoAlViaje,
  codigoViajeUnico,
  crearAlumno,
  crearViaje,
  fechaEnDias,
} from "./helpers";

/*
 * Dashboard (PRD M2): secciones, stat cards con destino filtrado, accesos
 * rápidos y "Alumnos con acción urgente" → ficha del alumno.
 */

test.describe("dashboard M2", () => {
  test("muestra las secciones y los accesos rápidos a las tareas frecuentes", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumen", exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Alumnos con acción urgente", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("region", { name: /^Alertas/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Viajes próximos", exact: true })).toBeVisible();

    const accesos = page.getByRole("navigation", { name: "Accesos rápidos" });
    const esperados = [
      ["+ Nuevo alumno", "/alumnos/nuevo"],
      ["+ Nuevo viaje", "/viajes/nuevo"],
      ["Registrar pago", "/pagos"],
      ["Consultas nuevas", "/consultas?estado=nueva"],
    ] as const;
    for (const [nombre, href] of esperados) {
      await expect(accesos.getByRole("link", { name: nombre, exact: true })).toHaveAttribute(
        "href",
        href
      );
    }
  });

  test("las stat cards llevan a la pantalla ya filtrada", async ({ page }) => {
    const destinos = [
      ["Alumnos", "/alumnos", "Alumnos"],
      ["Viajes confirmados", "/viajes?estado=confirmado", "Viajes"],
      ["Viajando ahora", "/viajes?estado=en_curso", "Viajes"],
      ["Alumnos en mora", "/pagos?estado=vencida", "Pagos"],
    ] as const;

    for (const [label, href, heading] of destinos) {
      await page.goto("/dashboard");
      // Por href: el destino filtrado ES lo que se prueba, y el texto de la card
      // ("Alumnos") también está contenido en otra ("Alumnos en mora").
      const card = page.getByRole("region", { name: "Resumen", exact: true }).locator(`a[href="${href}"]`);
      await expect(card).toContainText(label);
      await card.click();
      await page.waitForURL((url) => `${url.pathname}${url.search}` === href);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });

  test("un alumno con el pasaporte en riesgo aparece en acción urgente y lleva a su ficha", async ({
    page,
  }) => {
    // Viaje que sale hoy (inminente) y pasaporte que cubre el viaje —no pide
    // confirmación al asignar— pero vence dentro de los 6 meses: alerta crítica.
    const alumno = await crearAlumno(page, {
      nombre: "Urgente",
      // "Aa…": ante empate de urgencia el orden cae en el apellido, y así la fila
      // del test queda entre las primeras aunque haya datos acumulados.
      apellido: `Aaurgente${Math.floor(Math.random() * 100000)}`,
      vencimientoPasaporte: fechaEnDias(60),
    });
    const codigo = await crearViaje(page, {
      codigo: codigoViajeUnico(),
      fechaInicio: fechaEnDias(0),
      fechaFin: fechaEnDias(10),
    });

    await asignarAlumnoAlViaje(page, alumno);

    await page.goto("/dashboard");
    const urgentes = page.getByRole("region", { name: "Alumnos con acción urgente", exact: true });
    const fila = urgentes.getByRole("link", { name: new RegExp(alumno.apellido) });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText("Crítica");
    await expect(fila).toContainText("Pasaporte por vencer");
    await expect(fila).toContainText(codigo);

    // Si la lista corta, el "ver más" va al listado filtrado de alumnos.
    const verMas = urgentes.getByRole("link", { name: /^Ver (el restante|los \d+ restantes)$/ });
    if ((await verMas.count()) > 0) {
      await expect(verMas).toHaveAttribute("href", "/alumnos?alerta=pasos_bloqueados");
    }

    await fila.click();
    await page.waitForURL(`**/alumnos/${alumno.dni}`);
    await expect(page).toHaveURL(new RegExp(`/alumnos/${alumno.dni}$`));
  });
});
