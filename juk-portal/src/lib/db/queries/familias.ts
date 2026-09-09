import { randomBytes } from "node:crypto";

import { and, asc, eq, ne } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { users } from "@/lib/db/schema/users";
import { evaluarVinculoFamilia, type AlumnoVinculado } from "@/lib/domain/familias";

/**
 * Cuentas del Portal de Familias (US-19b + MIN-07).
 *
 * - Identidad de auth: EMAIL DEL TUTOR 1 (compatible Better-Auth); el DNI del
 *   alumno queda como selector dentro del portal (cuando exista).
 * - 1 cuenta por grupo familiar: si dos alumnos comparten tutor1Email, ambos
 *   cuelgan del mismo user (rol "familia").
 * - La cuenta nace con una password aleatoria que NO se comunica a nadie: la
 *   familia entra con el link de creación de contraseña que manda el admin
 *   ("Enviar acceso"), así que reenviarlo no invalida la clave vigente.
 * - Vincular a una cuenta que ya tiene alumnos de otro apellido exige
 *   confirmación explícita del admin (ver domain/familias/vinculo.ts).
 */

/** Password inicial de la cuenta: aleatoria y nunca comunicada. */
function passwordPlaceholder(): string {
  return randomBytes(24).toString("base64url");
}

export type MotivoSinCuenta = "alumno_inexistente" | "email_del_equipo";

export type ResultadoCuentaFamilia =
  | { estado: "vinculada"; userId: string }
  | { estado: "sin_cuenta"; motivo: MotivoSinCuenta }
  | { estado: "requiere_confirmacion"; userId: string; alumnos: AlumnoVinculado[] };

async function alumnosActivosDeCuenta(familiaUserId: string): Promise<AlumnoVinculado[]> {
  return db
    .select({
      id: alumnos.id,
      dni: alumnos.dni,
      nombre: alumnos.nombre,
      apellido: alumnos.apellido,
    })
    .from(alumnos)
    .where(and(eq(alumnos.familiaUserId, familiaUserId), ne(alumnos.estado, "baja")));
}

async function vincularAlumno(alumnoId: string, userId: string): Promise<void> {
  await db
    .update(alumnos)
    .set({ familiaUserId: userId, updatedAt: new Date() })
    .where(eq(alumnos.id, alumnoId));
}

/**
 * Find-or-create de la cuenta de familia y vínculo con el alumno.
 * Con `confirmarVinculo` el admin acepta colgar el alumno de una cuenta que ya
 * tiene alumnos de otro apellido.
 */
export async function asegurarCuentaFamilia(
  alumnoId: string,
  tutorEmail: string,
  tutorNombre: string,
  opts: { confirmarVinculo?: boolean } = {}
): Promise<ResultadoCuentaFamilia> {
  const email = tutorEmail.toLowerCase();

  const alumnoRows = await db
    .select({ id: alumnos.id, dni: alumnos.dni, apellido: alumnos.apellido })
    .from(alumnos)
    .where(eq(alumnos.id, alumnoId))
    .limit(1);
  const alumno = alumnoRows[0];
  if (!alumno) return { estado: "sin_cuenta", motivo: "alumno_inexistente" };

  const existentes = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const usuario = existentes[0] ?? null;

  const decision = evaluarVinculoFamilia({
    usuario,
    alumnosDeLaCuenta: usuario ? await alumnosActivosDeCuenta(usuario.id) : [],
    alumno,
  });

  switch (decision.tipo) {
    case "email_del_equipo":
      return { estado: "sin_cuenta", motivo: "email_del_equipo" };

    case "conflicto": {
      if (!opts.confirmarVinculo) {
        return {
          estado: "requiere_confirmacion",
          userId: decision.userId,
          alumnos: decision.alumnos,
        };
      }
      await vincularAlumno(alumnoId, decision.userId);
      return { estado: "vinculada", userId: decision.userId };
    }

    case "vincular": {
      await vincularAlumno(alumnoId, decision.userId);
      return { estado: "vinculada", userId: decision.userId };
    }

    case "crear": {
      await auth.api.signUpEmail({
        body: { email, password: passwordPlaceholder(), name: tutorNombre },
      });
      await db
        .update(users)
        .set({ role: "familia", emailVerified: true })
        .where(eq(users.email, email));
      const row = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const userId = row[0]?.id;
      if (!userId) return { estado: "sin_cuenta", motivo: "email_del_equipo" };
      await vincularAlumno(alumnoId, userId);
      return { estado: "vinculada", userId };
    }
  }
}

export type ResultadoEnvioAcceso =
  | { estado: "listo"; userId: string; email: string; nombre: string }
  | { estado: "sin_cuenta"; motivo: MotivoSinCuenta }
  | { estado: "requiere_confirmacion"; alumnos: AlumnoVinculado[] };

/**
 * Deja la cuenta lista para mandarle el link de creación de contraseña.
 * NO toca la password vigente: reenviar el acceso no deja afuera a la familia.
 */
export async function prepararEnvioAcceso(
  alumnoId: string,
  opts: { confirmarVinculo?: boolean } = {}
): Promise<ResultadoEnvioAcceso> {
  const rows = await db.select().from(alumnos).where(eq(alumnos.id, alumnoId)).limit(1);
  const alumno = rows[0];
  if (!alumno) return { estado: "sin_cuenta", motivo: "alumno_inexistente" };

  const datos = { email: alumno.tutor1Email, nombre: alumno.tutor1Nombre };
  if (alumno.familiaUserId) {
    return { estado: "listo", userId: alumno.familiaUserId, ...datos };
  }

  const cuenta = await asegurarCuentaFamilia(
    alumnoId,
    alumno.tutor1Email,
    alumno.tutor1Nombre,
    opts
  );
  if (cuenta.estado === "vinculada") {
    return { estado: "listo", userId: cuenta.userId, ...datos };
  }
  if (cuenta.estado === "requiere_confirmacion") {
    return { estado: "requiere_confirmacion", alumnos: cuenta.alumnos };
  }
  return cuenta;
}

/** Marca el acceso como enviado (después de que el email salió). */
export async function marcarAccesoEnviado(alumnoId: string): Promise<void> {
  await db
    .update(alumnos)
    .set({ accesoFamiliaEnviadoAt: new Date(), updatedAt: new Date() })
    .where(eq(alumnos.id, alumnoId));
}

/**
 * Baja del alumno → desactiva la cuenta de familia SOLO si no le quedan otros
 * alumnos activos (1 cuenta por grupo familiar).
 */
export async function desactivarCuentaFamiliaSiCorresponde(alumnoId: string): Promise<void> {
  const rows = await db
    .select({ familiaUserId: alumnos.familiaUserId })
    .from(alumnos)
    .where(eq(alumnos.id, alumnoId))
    .limit(1);
  const familiaUserId = rows[0]?.familiaUserId;
  if (!familiaUserId) return;

  const hermanosActivos = await db
    .select({ id: alumnos.id })
    .from(alumnos)
    .where(
      and(
        eq(alumnos.familiaUserId, familiaUserId),
        ne(alumnos.id, alumnoId),
        ne(alumnos.estado, "baja")
      )
    )
    .limit(1);
  if (hermanosActivos.length > 0) return;

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, familiaUserId));
}

/** Alumnos activos de un grupo familiar, ordenados por apellido, nombre. */
export async function getAlumnosDeFamilia(
  familiaUserId: string
): Promise<{ id: string; dni: string; nombre: string; apellido: string }[]> {
  return db
    .select({ id: alumnos.id, dni: alumnos.dni, nombre: alumnos.nombre, apellido: alumnos.apellido })
    .from(alumnos)
    .where(and(eq(alumnos.familiaUserId, familiaUserId), ne(alumnos.estado, "baja")))
    .orderBy(asc(alumnos.apellido), asc(alumnos.nombre));
}
