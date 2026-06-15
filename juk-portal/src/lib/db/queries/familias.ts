import { randomBytes } from "node:crypto";

import { and, asc, eq, ne } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { users } from "@/lib/db/schema/users";

/**
 * Cuentas del Portal de Familias (US-19b + MIN-07).
 *
 * - Identidad de auth: EMAIL DEL TUTOR 1 (compatible Better-Auth); el DNI del
 *   alumno queda como selector dentro del portal (cuando exista).
 * - 1 cuenta por grupo familiar: si dos alumnos comparten tutor1Email, ambos
 *   cuelgan del mismo user (rol "familia").
 * - Las credenciales se GENERAN al crear el alumno; el ENVÍO es acción manual
 *   del admin (resetea la password temporal en ese momento).
 */

function passwordTemporal(): string {
  return randomBytes(9).toString("base64url");
}

/** Find-or-create de la cuenta de familia; vincula el alumno. Best-effort. */
export async function asegurarCuentaFamilia(
  alumnoId: string,
  tutorEmail: string,
  tutorNombre: string
): Promise<string | null> {
  const email = tutorEmail.toLowerCase();

  let userId: string | null = null;
  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    // Si el email ya es de un admin/GL, NO lo tocamos: queda sin cuenta de
    // familia (caso borde a resolver a mano).
    userId = existing[0]!.role === "familia" ? existing[0]!.id : null;
  } else {
    await auth.api.signUpEmail({
      body: { email, password: passwordTemporal(), name: tutorNombre },
    });
    await db
      .update(users)
      .set({ role: "familia", emailVerified: true })
      .where(eq(users.email, email));
    const row = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    userId = row[0]?.id ?? null;
  }

  if (userId) {
    await db
      .update(alumnos)
      .set({ familiaUserId: userId, updatedAt: new Date() })
      .where(eq(alumnos.id, alumnoId));
  }
  return userId;
}

/**
 * Regenera la password temporal y marca el acceso como enviado.
 * Devuelve la password para el email (no se persiste en claro).
 */
export async function prepararEnvioAcceso(alumnoId: string): Promise<{
  email: string;
  nombre: string;
  passwordTemporal: string;
} | null> {
  const rows = await db.select().from(alumnos).where(eq(alumnos.id, alumnoId)).limit(1);
  const alumno = rows[0];
  if (!alumno) return null;

  // Asegurar la cuenta (alumnos creados antes de esta feature no la tienen).
  const userId =
    alumno.familiaUserId ??
    (await asegurarCuentaFamilia(alumnoId, alumno.tutor1Email, alumno.tutor1Nombre));
  if (!userId) return null;

  const nueva = passwordTemporal();
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(nueva);
  await ctx.internalAdapter.updatePassword(userId, hash);

  await db
    .update(alumnos)
    .set({ accesoFamiliaEnviadoAt: new Date(), updatedAt: new Date() })
    .where(eq(alumnos.id, alumnoId));

  return { email: alumno.tutor1Email, nombre: alumno.tutor1Nombre, passwordTemporal: nueva };
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
