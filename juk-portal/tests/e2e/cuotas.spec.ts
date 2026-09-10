import { test, expect } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  asignarAlumnoAlViaje,
  confirmarModal,
  crearAlumno,
  crearPlanCuotas,
  crearViaje,
  expectEstadoPasoAlumno,
  pasoAlumno,
} from "./helpers";

test("plan de cuotas end-to-end: pagos completan B1, desbloquean C2 y B2 cierra presencial", async ({
  page,
}) => {
  // Alta + asignación (viaje con origen independiente → B2 aplica)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);
  await abrirFichaDesdeViaje(page, alumno);

  // Crear el plan: 2 cuotas de USD 500
  const panel = await crearPlanCuotas(page, {
    cuotas: "2",
    monto: "500",
    primerVencimiento: "2026-12-10",
  });

  // El plan aparece con total y última cuota presencial (B2)
  await expect(panel.getByText("US$ 1.000,00")).toBeVisible();
  await expect(panel.getByText("Presencial JUK")).toBeVisible();

  // Pagar la cuota 1 (vía agencia) → B1 en progreso. La 2° es presencial (B2),
  // así que es la única fila con "Registrar pago".
  await panel.getByRole("button", { name: "Registrar pago", exact: true }).click();
  await confirmarModal(page, "Registrar pago");
  await expectEstadoPasoAlumno(page, "b1", "En progreso");
  await expect(pasoAlumno(page, "b1").getByText("1 de 2 cuotas acreditadas")).toBeVisible();

  // C2 sigue bloqueado hasta completar B1
  await expectEstadoPasoAlumno(page, "c2", "Bloqueado");

  // Confirmar B2 (última cuota presencial) → B1 completado, C2 desbloqueado, B2 completado
  await panel.getByRole("button", { name: "Confirmar pago presencial" }).click();
  await confirmarModal(page, "Sí, confirmar pago");
  await expectEstadoPasoAlumno(page, "b1", "Completado");
  await expectEstadoPasoAlumno(page, "c2", "Pendiente");
  await expectEstadoPasoAlumno(page, "b2", "Completado");

  // El resumen quedó saldado
  await expect(panel.getByText("Plan saldado")).toBeVisible();
});
