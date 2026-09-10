import { eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { alumnos, users } from "../../src/lib/db/schema";

import { confirmarModal } from "./helpers";
import { crearAlumnoUI } from "./helpers-flujos";

/*
 * Ciclo de vida del alumno en el back-office más allá del alta (que ya cubre
 * alumnos.spec.ts): edición con la marca de pasaporte actualizado (US-18),
 * DNI duplicado al EDITAR, y baja/reactivación con su efecto sobre la cuenta
 * de familia (US-19b).
 */

async function alumnoEnDb(dni: string) {
  const [fila] = await db.select().from(alumnos).where(eq(alumnos.dni, dni)).limit(1);
  if (!fila) throw new Error(`No existe el alumno ${dni}`);
  return fila;
}

test("editar un alumno guarda los cambios y marca el pasaporte como actualizado", async ({ page }) => {
  const alumno = await crearAlumnoUI(page);
  const nuevoPasaporte = `ED${100000 + Math.floor(Math.random() * 899999)}`;
  const nuevoCelular = "+541188887777";

  await page.goto(`/alumnos/${alumno.dni}`);
  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();
  await expect(page.getByText("Pasaporte actualizado", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Editar datos" }).click();
  await expect(page).toHaveURL(new RegExp(`/alumnos/${alumno.dni}/editar$`));
  await page.getByLabel("N° de pasaporte*").fill(nuevoPasaporte);
  await page.getByLabel("Celular*", { exact: true }).fill(nuevoCelular);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/alumnos$/);

  await page.goto(`/alumnos/${alumno.dni}`);
  await expect(page.getByText(nuevoPasaporte, { exact: true })).toBeVisible();
  await expect(page.getByText(nuevoCelular, { exact: true })).toBeVisible();
  // Cambiar el N° de pasaporte obliga a re-verificar la Immigration Letter.
  await expect(page.getByText("Pasaporte actualizado", { exact: true })).toBeVisible();

  const fila = await alumnoEnDb(alumno.dni);
  expect(fila.numeroPasaporte).toBe(nuevoPasaporte);
  expect(fila.tutor1Celular).toBe(nuevoCelular);
  expect(fila.pasaporteActualizadoAt).not.toBeNull();
});

test("editar el DNI a uno ya registrado se explica por campo y no pisa a ninguno de los dos", async ({
  page,
}) => {
  const existente = await crearAlumnoUI(page);
  const editado = await crearAlumnoUI(page);

  await page.goto(`/alumnos/${editado.dni}/editar`);
  await page.getByLabel("DNI*").fill(existente.dni);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Ese DNI ya está registrado")).toBeVisible();
  await expect(page.getByText("Ya existe un alumno con ese DNI.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/alumnos/${editado.dni}/editar$`));

  expect((await alumnoEnDb(editado.dni)).apellido).toBe(editado.apellido);
  expect((await alumnoEnDb(existente.dni)).apellido).toBe(existente.apellido);
});

test("dar de baja guarda el motivo y desactiva la cuenta de familia; reactivar lo vuelve asignable", async ({
  page,
}) => {
  const alumno = await crearAlumnoUI(page);
  const motivo = `E2E: la familia pospone el viaje (${Date.now()})`;

  const cuentaFamilia = async () => {
    const [fila] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.email, alumno.tutorEmail))
      .limit(1);
    return fila;
  };
  // US-19b: la cuenta de familia nace con el alta del alumno.
  expect((await cuentaFamilia())?.isActive).toBe(true);

  await page.goto(`/alumnos/${alumno.dni}/editar`);
  await page.getByRole("button", { name: "Dar de baja" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText(`¿Dar de baja a ${alumno.nombre} ${alumno.apellido}?`);
  await dialogo.getByLabel("Motivo (opcional)").fill(motivo);
  await confirmarModal(page, "Sí, dar de baja");
  await expect(page).toHaveURL(/\/alumnos$/);

  await page.goto(`/alumnos/${alumno.dni}`);
  await expect(page.getByText(`Baja · DNI ${alumno.dni}`)).toBeVisible();
  await expect(page.getByText(/El alumno está dado de baja/)).toBeVisible();
  await expect(page.locator("[data-asignar-viaje]")).toHaveCount(0);

  const dadoDeBaja = await alumnoEnDb(alumno.dni);
  expect(dadoDeBaja.estado).toBe("baja");
  expect(dadoDeBaja.motivoBaja).toBe(motivo);
  // Sin hermanos activos, la cuenta de familia queda desactivada.
  expect((await cuentaFamilia())?.isActive).toBe(false);

  await page.getByRole("link", { name: "Editar datos" }).click();
  const reactivar = page.getByRole("button", { name: "Reactivar" });
  await expect(reactivar).toBeVisible();
  await expect(page.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
  await reactivar.click();
  await expect(page).toHaveURL(/\/alumnos$/);

  await page.goto(`/alumnos/${alumno.dni}`);
  await expect(page.getByText(`Activo · DNI ${alumno.dni}`)).toBeVisible();
  await expect(page.locator("[data-asignar-viaje]")).toBeVisible();

  const reactivado = await alumnoEnDb(alumno.dni);
  expect(reactivado.estado).toBe("activo");
  expect(reactivado.motivoBaja).toBeNull();
});
