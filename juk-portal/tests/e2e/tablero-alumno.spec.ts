import { test, expect } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  asignarAlumnoAlViaje,
  crearAlumno,
  crearViaje,
  expectEstadoPasoAlumno,
  pasoAlumno,
  selectorEstadoPasoAlumno,
} from "./helpers";

test("al asignar un alumno se crea su tablero M6 y se pueden transicionar pasos", async ({
  page,
}) => {
  // Alta de alumno + viaje + asignación (el trigger crea los pasos)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);

  // Ir al detalle del alumno desde el roster
  await abrirFichaDesdeViaje(page, alumno);

  // El tablero muestra los grupos y el Paso 0 (solo lectura, sin selector)
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
  // Heading del grupo B (y no el link "Pagos" de la sidebar, que tiene el mismo texto).
  await expect(page.getByRole("heading", { level: 3, name: /Pagos$/ })).toBeVisible();
  await expect(page.getByText("Documentación de viaje")).toBeVisible();
  await expect(page.getByText("Application Form JUK (origen)")).toBeVisible();

  // C2 nace bloqueado por la dependencia con B1
  await expectEstadoPasoAlumno(page, "c2", "Bloqueado");

  // B1 es solo lectura: su estado lo deriva el plan de cuotas, así que su card
  // no tiene selector de transición.
  await expect(pasoAlumno(page, "b1").getByRole("combobox")).toHaveCount(0);

  // Un paso editable sí se transiciona desde su card (A1: pendiente → en progreso).
  await selectorEstadoPasoAlumno(page, "a1").selectOption("en_progreso");
  await expectEstadoPasoAlumno(page, "a1", "En progreso");
});
