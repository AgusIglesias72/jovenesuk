import { and, count, desc, eq, gte, ilike, ne, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  consultas,
  suscriptores,
  type Consulta,
  type NewConsulta,
} from "@/lib/db/schema/leads";
import type { EstadoConsulta } from "@/lib/domain/leads";
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

import { unicaFila } from "./errors";

/** Suscripción idempotente: re-suscribir el mismo email no duplica ni falla. */
export async function suscribir(email: string, origen = "hero"): Promise<void> {
  await db
    .insert(suscriptores)
    .values({ email, origen })
    .onConflictDoNothing({ target: suscriptores.email });
}

export async function crearConsulta(data: NewConsulta): Promise<Consulta> {
  const rows = await db.insert(consultas).values(data).returning();
  return unicaFila(rows, "consultas");
}

/**
 * Fecha de la consulta anterior del mismo email por el mismo interés dentro de
 * la ventana (excluyendo la recién creada). Alimenta el dedup del AVISO al
 * equipo: el lead se persiste siempre, la notificación no se repite.
 */
export async function fechaConsultaPreviaSimilar(opts: {
  email: string;
  modalidad: Consulta["modalidad"];
  desde: Date;
  excluirId: string;
}): Promise<Date | null> {
  const rows = await db
    .select({ creadoEl: consultas.creadoEl })
    .from(consultas)
    .where(
      and(
        eq(consultas.email, opts.email),
        eq(consultas.modalidad, opts.modalidad),
        gte(consultas.creadoEl, opts.desde),
        ne(consultas.id, opts.excluirId)
      )
    )
    .orderBy(desc(consultas.creadoEl))
    .limit(1);

  return rows[0]?.creadoEl ?? null;
}

export async function getConsultaById(id: string): Promise<Consulta | null> {
  const rows = await db.select().from(consultas).where(eq(consultas.id, id)).limit(1);
  return rows[0] ?? null;
}

export type ConsultaFilters = {
  q?: string;
  estado?: EstadoConsulta;
};

function condicionesConsultas(filters: ConsultaFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(
      ilike(consultas.nombre, like),
      ilike(consultas.apellido, like),
      ilike(consultas.email, like)
    );
    if (match) conditions.push(match);
  }
  if (filters.estado) conditions.push(eq(consultas.estado, filters.estado));

  return conditions.length ? and(...conditions) : undefined;
}

export async function listConsultas(
  filters: ConsultaFilters,
  pagina: Pagina
): Promise<Paginado<Consulta>> {
  const where = condicionesConsultas(filters);

  return paginarEnSql(
    pagina,
    (limit, offset) =>
      db
        .select()
        .from(consultas)
        .where(where)
        .orderBy(desc(consultas.creadoEl))
        .limit(limit)
        .offset(offset),
    () => db.select({ n: count() }).from(consultas).where(where).then(totalDe)
  );
}

export async function updateEstadoConsulta(
  id: string,
  estado: EstadoConsulta
): Promise<Consulta | null> {
  const rows = await db
    .update(consultas)
    .set({ estado })
    .where(eq(consultas.id, id))
    .returning();
  return rows[0] ?? null;
}
