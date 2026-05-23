"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  createAlumno,
  darDeBajaAlumno,
  reactivarAlumno,
  updateAlumno,
} from "@/lib/db/queries/alumnos";
import {
  AlumnoNotFoundError,
  alumnoCreateSchema,
  alumnoUpdateSchema,
} from "@/lib/domain/alumnos";
import type { Alumno } from "@/lib/db/schema/alumnos";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

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
    await safeAudit({
      accion: "create",
      entidadTipo: "alumno",
      entidadId: alumno.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    return { ok: true, data: alumno };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el alumno. Probá de nuevo." };
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
    const alumno = await updateAlumno(id, data);
    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: id,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    revalidatePath(`/alumnos/${id}/editar`);
    return { ok: true, data: alumno };
  } catch (err) {
    if (err instanceof AlumnoNotFoundError) {
      return { ok: false, error: "El alumno no existe." };
    }
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
    await safeAudit({
      accion: "soft_delete",
      entidadTipo: "alumno",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
    });
    revalidatePath("/alumnos");
    revalidatePath(`/alumnos/${parsedId.data}/editar`);
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
    revalidatePath(`/alumnos/${parsedId.data}/editar`);
    return { ok: true, data: alumno };
  } catch (err) {
    if (err instanceof AlumnoNotFoundError) {
      return { ok: false, error: "El alumno no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos reactivar al alumno." };
  }
}
