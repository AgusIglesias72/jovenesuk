import { and, eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { auditoria, viajes } from "../../src/lib/db/schema";

import { confirmarModal, crearViaje, panelAlumnosAsignados } from "./helpers";
import {
  asignacionesDeAlumno,
  asignarDesdeRoster,
  crearAlumnoPorWebhook,
  crearViajeConTipo,
  estadoDelViaje,
  viajeIdPorCodigo,
} from "./helpers-flujos";

/*
 * Reglas de la asignación desde el roster del viaje:
 *   - US-11: pasarse de la capacidad advierte pero NO bloquea (confirmación);
 *   - US-13: el 5to inscripto de un viaje Grupal lo confirma solo.
 * La advertencia de pasaporte ya la cubre asignar-desde-alumno.spec.ts (misma
 * server action). Los alumnos entran por webhook (rápido y sin DNIs reales).
 */

async function estadoViajeEnDb(viajeId: string) {
  const [fila] = await db
    .select({ estado: viajes.estado })
    .from(viajes)
    .where(eq(viajes.id, viajeId))
    .limit(1);
  return fila?.estado;
}

test("sobre-cupo: advierte antes de pasarse de la capacidad; cancelar no asigna y confirmar sí", async ({
  page,
  request,
}) => {
  const primero = await crearAlumnoPorWebhook(request, { etiqueta: "CA" });
  const segundo = await crearAlumnoPorWebhook(request, { etiqueta: "CB" });

  // Individual: capacidad fija de 1 y nace Confirmado (inscribible).
  await crearViajeConTipo(page, { tipo: "individual" });
  const roster = panelAlumnosAsignados(page);
  await expect(roster.getByText("0 / 1 cupos")).toBeVisible();

  // Dentro del cupo: asigna sin preguntar.
  await asignarDesdeRoster(page, primero.label);
  await expect(roster.getByRole("link", { name: primero.label })).toBeVisible();
  await expect(roster.getByText("1 / 1 cupos")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    roster.getByText("Cupo completo: asignar más requiere confirmación explícita.")
  ).toBeVisible();

  // Pasarse del cupo pide confirmación; cancelar no asigna.
  await asignarDesdeRoster(page, segundo.label);
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("el viaje queda por encima de su capacidad máxima");
  await confirmarModal(page, "Cancelar");
  await expect(dialogo).toHaveCount(0);
  await expect(roster.getByText("1 / 1 cupos")).toBeVisible();
  await expect(roster.getByRole("link", { name: segundo.label })).toHaveCount(0);
  expect(await asignacionesDeAlumno(segundo.alumnoId)).toHaveLength(0);

  // Confirmando, asigna por encima de la capacidad.
  await asignarDesdeRoster(page, segundo.label);
  await expect(dialogo).toContainText("capacidad máxima");
  await confirmarModal(page, "Asignar igual");
  await expect(roster.getByRole("link", { name: segundo.label })).toBeVisible();
  await expect(roster.getByText("2 / 1 cupos")).toBeVisible();
  const asignadas = await asignacionesDeAlumno(segundo.alumnoId);
  expect(asignadas.map((a) => a.estado)).toEqual(["activa"]);
});

test("el 5to inscripto confirma automáticamente el viaje grupal (el 4to todavía no)", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const codigo = await crearViaje(page);
  const viajeId = await viajeIdPorCodigo(codigo);

  for (const etiqueta of ["G1", "G2", "G3", "G4"]) {
    const inscripto = await crearAlumnoPorWebhook(request, { etiqueta, codigoViaje: codigo });
    expect(inscripto.asignacionId, `${etiqueta} debía quedar asignado`).not.toBeNull();
  }
  // Con 4 sigue abierto: el umbral es 5.
  expect(await estadoViajeEnDb(viajeId)).toBe("inscripcion_abierta");

  const quinto = await crearAlumnoPorWebhook(request, { etiqueta: "G5" });
  await page.reload();
  const roster = panelAlumnosAsignados(page);
  await expect(roster.getByText(/^4 \/ \d+ cupos$/)).toBeVisible();
  await expect(estadoDelViaje(page)).toHaveText("Inscripción abierta");

  await asignarDesdeRoster(page, quinto.label);
  await expect(roster.getByRole("link", { name: quinto.label })).toBeVisible();
  await expect(roster.getByText(/^5 \/ \d+ cupos$/)).toBeVisible();
  await expect(estadoDelViaje(page)).toHaveText("Confirmado");

  expect(await estadoViajeEnDb(viajeId)).toBe("confirmado");
  const cambios = await db
    .select({ metadata: auditoria.metadata })
    .from(auditoria)
    .where(and(eq(auditoria.entidadId, viajeId), eq(auditoria.accion, "cambio_estado_viaje")));
  expect(cambios.map((c) => c.metadata)).toContainEqual(
    expect.objectContaining({ estado: "confirmado", motivo: "auto_5_alumnos" })
  );
});
