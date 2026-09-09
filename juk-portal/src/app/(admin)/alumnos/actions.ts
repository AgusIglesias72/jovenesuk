"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { auth } from "@/lib/auth";
import { requireAdminJuk } from "@/lib/auth/helpers";
import {
  createAlumno,
  darDeBajaAlumno,
  getAlumnoById,
  reactivarAlumno,
  updateAlumno,
} from "@/lib/db/queries/alumnos";
import { esViolacionUnique } from "@/lib/db/queries/errors";
import {
  asegurarCuentaFamilia,
  desactivarCuentaFamiliaSiCorresponde,
  marcarAccesoEnviado,
  prepararEnvioAcceso,
} from "@/lib/db/queries/familias";
import {
  AlumnoNotFoundError,
  alumnoCreateSchema,
  alumnoUpdateSchema,
} from "@/lib/domain/alumnos";
import { describirAlumnosVinculados } from "@/lib/domain/familias";
import type { Alumno } from "@/lib/db/schema/alumnos";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export async function createAlumnoAction(
  input: unknown
): Promise<ActionResult<Alumno>> {
  const session = await requireAdminJuk();

  const parsed = alumnoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const alumno = await createAlumno({
      ...parsed.data,
      procesadoPor: session.user.id,
    });
    // US-19b: las credenciales del Portal de Familias se generan al CREAR el
    // alumno (el envío es otra acción). Best-effort: no frena el alta.
    try {
      await asegurarCuentaFamilia(alumno.id, alumno.tutor1Email, alumno.tutor1Nombre);
    } catch (err) {
      Sentry.captureException(err);
    }
    await safeAudit({
      accion: "create",
      entidadTipo: "alumno",
      entidadId: alumno.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    return { ok: true, data: alumno };
  } catch (err) {
    if (esViolacionUnique(err)) return dniDuplicado();
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el alumno. Probá de nuevo." };
  }
}

/** Única constraint UNIQUE de `alumnos`: el DNI (uniq_alumnos_dni). */
function dniDuplicado(): ActionResult<never> {
  return {
    ok: false,
    error: "Ya existe un alumno con ese DNI.",
    fieldErrors: { dni: ["Ese DNI ya está registrado"] },
  };
}

/**
 * US-19b: envío (o reenvío) del acceso al Portal de Familias. Manda un link de
 * creación de contraseña (24 h) al Tutor 1: NO toca la clave vigente, así que
 * reenviarlo no deja afuera a una familia que ya entraba.
 */
export async function enviarAccesoFamiliaAction(
  alumnoId: string,
  confirmarVinculo = false
): Promise<ActionResult<{ enviadoA: string }>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(alumnoId);
  if (!parsedId.success) return { ok: false, error: "Alumno inválido." };

  try {
    const datos = await prepararEnvioAcceso(parsedId.data, { confirmarVinculo });

    if (datos.estado === "requiere_confirmacion") {
      return {
        ok: false,
        requiereConfirmacion: true,
        error: `Ese email ya es la cuenta de familia de ${describirAlumnosVinculados(
          datos.alumnos
        )}. Si es la misma familia, confirmá para vincular al alumno; si no, corregí el email del Tutor 1.`,
      };
    }
    if (datos.estado === "sin_cuenta") {
      return {
        ok: false,
        error:
          datos.motivo === "email_del_equipo"
            ? "El email del Tutor 1 ya pertenece a un usuario del equipo: usá otra dirección."
            : "El alumno no existe.",
      };
    }

    await auth.api.requestPasswordReset({
      body: { email: datos.email, redirectTo: "/reset-password?alta=familia" },
    });
    await marcarAccesoEnviado(parsedId.data);

    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
      metadata: {
        accion: "enviar_acceso_familia",
        enviadoA: datos.email,
        ...(confirmarVinculo ? { vinculoFamiliaConfirmado: true } : {}),
      },
    });
    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { enviadoA: datos.email } };
  } catch (err) {
    Sentry.captureException(err);
    return {
      ok: false,
      error: "No pudimos enviar el email de acceso. Revisá la configuración de Resend.",
    };
  }
}

export async function updateAlumnoAction(
  input: unknown
): Promise<ActionResult<Alumno>> {
  const session = await requireAdminJuk();

  const parsed = alumnoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id, ...data } = parsed.data;
  try {
    // US-18: los cambios de datos de pasaporte quedan marcados con fecha.
    const actual = await getAlumnoById(id);
    const pasaporteCambio =
      !!actual &&
      (actual.nombre !== data.nombre ||
        actual.apellido !== data.apellido ||
        actual.numeroPasaporte !== data.numeroPasaporte ||
        actual.fechaNacimiento.getTime() !== data.fechaNacimiento.getTime() ||
        actual.fechaVencimientoPasaporte.getTime() !== data.fechaVencimientoPasaporte.getTime());

    const alumno = await updateAlumno(id, {
      ...data,
      ...(pasaporteCambio ? { pasaporteActualizadoAt: new Date() } : {}),
    });
    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: id,
      usuarioId: session.user.id,
      ...(pasaporteCambio ? { metadata: { pasaporteActualizado: true } } : {}),
    });
    revalidatePath("/alumnos");
    revalidatePath("/alumnos/[id]/editar", "page");
    return { ok: true, data: alumno };
  } catch (err) {
    if (err instanceof AlumnoNotFoundError) {
      return { ok: false, error: "El alumno no existe." };
    }
    if (esViolacionUnique(err)) return dniDuplicado();
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}

export async function darDeBajaAlumnoAction(
  id: string,
  motivo: string | null
): Promise<ActionResult<Alumno>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Alumno inválido." };

  try {
    const alumno = await darDeBajaAlumno(parsedId.data, motivo?.trim() || null);
    // US-19b: la baja desactiva la cuenta de familia si no quedan hermanos activos.
    try {
      await desactivarCuentaFamiliaSiCorresponde(parsedId.data);
    } catch (err) {
      Sentry.captureException(err);
    }
    await safeAudit({
      accion: "soft_delete",
      entidadTipo: "alumno",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    revalidatePath("/alumnos/[id]/editar", "page");
    return { ok: true, data: alumno };
  } catch (err) {
    if (err instanceof AlumnoNotFoundError) {
      return { ok: false, error: "El alumno no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos dar de baja al alumno." };
  }
}

export async function reactivarAlumnoAction(
  id: string
): Promise<ActionResult<Alumno>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Alumno inválido." };

  try {
    const alumno = await reactivarAlumno(parsedId.data);
    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    revalidatePath("/alumnos/[id]/editar", "page");
    return { ok: true, data: alumno };
  } catch (err) {
    if (err instanceof AlumnoNotFoundError) {
      return { ok: false, error: "El alumno no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos reactivar al alumno." };
  }
}
