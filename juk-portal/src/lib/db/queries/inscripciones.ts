import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones, type Inscripcion } from "@/lib/db/schema/inscripciones";
import { viajes } from "@/lib/db/schema/viajes";
import {
  INSCRIPCION_ESTADOS,
  VARIANTES,
  parsearCodigoInscripcion,
  type InscripcionEstado,
  type InscripcionFilters,
  type Variante,
} from "@/lib/domain/inscripciones/schema";
import { soloDigitos } from "@/lib/utils/dni";
import { paginarEnSql, totalDe, type Pagina, type Paginado } from "@/lib/utils/paginate";

/**
 * La bandeja de inscripciones del back-office: listado paginado, detalle por
 * código y los conteos de las StatCards. Lo que usa el formulario público vive
 * aparte, en `inscripciones-publicas.ts`.
 */

/**
 * La fila de la tabla trae lo justo para decidir qué hacer con la ficha. Los
 * datos de Nivel 2 que no se muestran en una lista (pasaporte, fecha de
 * nacimiento, teléfonos, alergias) NO se seleccionan: el listado es la consulta
 * que más veces corre y no tiene por qué mover datos de salud. El detalle sí
 * los trae. El DNI viaja porque la tabla lo muestra enmascarado
 * (`enmascararDni`) y es el dato con el que el equipo busca.
 */
export type InscripcionListItem = {
  id: string;
  numero: number;
  estado: InscripcionEstado;
  variante: Variante;
  createdAt: Date;
  nombre: string;
  apellido: string;
  dni: string;
  tutor1Email: string;
  motivo: string | null;
  alumnoId: string | null;
  viajeId: string | null;
  viajeCodigo: string | null;
  viajeNombre: string | null;
};

export type InscripcionDetalle = Inscripcion & {
  viajeCodigo: string | null;
  viajeNombre: string | null;
};

/**
 * `borradoEl` es el borrado que pidió una persona (privacidad), distinto del
 * estado `anulada`, que sí se lista: una ficha borrada no vuelve a aparecer en
 * la bandeja ni suma en los conteos. Va acá, en el filtro compartido, para que
 * listado, detalle y resumen cuenten exactamente el mismo universo.
 */
function condicionesInscripciones(filtros: Partial<InscripcionFilters>): SQL | undefined {
  const condiciones: SQL[] = [isNull(inscripciones.borradoEl)];

  if (filtros.estado) condiciones.push(eq(inscripciones.estado, filtros.estado));
  if (filtros.viajeId) condiciones.push(eq(inscripciones.viajeId, filtros.viajeId));
  if (filtros.variante) condiciones.push(eq(inscripciones.variante, filtros.variante));

  if (filtros.q) {
    const patron = `%${filtros.q.trim()}%`;
    const alternativas: SQL[] = [
      ilike(inscripciones.nombre, patron),
      ilike(inscripciones.apellido, patron),
    ];
    // El DNI se guarda en dígitos (TEC-12) y el equipo lo tipea con puntos:
    // sin normalizar, buscar "45.102.338" no encontraría nada.
    const digitos = soloDigitos(filtros.q);
    if (digitos) alternativas.push(ilike(inscripciones.dni, `%${digitos}%`));

    const numero = parsearCodigoInscripcion(filtros.q);
    if (numero !== null) alternativas.push(eq(inscripciones.numero, numero));

    const match = or(...alternativas);
    if (match) condiciones.push(match);
  }

  return and(...condiciones);
}

export async function listInscripciones(
  filtros: InscripcionFilters,
  pagina: Pagina
): Promise<Paginado<InscripcionListItem>> {
  const where = condicionesInscripciones(filtros);

  return paginarEnSql(
    pagina,
    (limit, offset) =>
      db
        .select({
          id: inscripciones.id,
          numero: inscripciones.numero,
          estado: inscripciones.estado,
          variante: inscripciones.variante,
          createdAt: inscripciones.createdAt,
          nombre: inscripciones.nombre,
          apellido: inscripciones.apellido,
          dni: inscripciones.dni,
          tutor1Email: inscripciones.tutor1Email,
          motivo: inscripciones.motivo,
          alumnoId: inscripciones.alumnoId,
          viajeId: inscripciones.viajeId,
          viajeCodigo: viajes.codigo,
          viajeNombre: viajes.nombre,
        })
        .from(inscripciones)
        .leftJoin(viajes, eq(inscripciones.viajeId, viajes.id))
        .where(where)
        // Lo último arriba. `numero` desempata y es único: dos fichas cargadas
        // en el mismo instante (una tanda de invitaciones se responde junta)
        // comparten `created_at`, y un ORDER BY no total con LIMIT/OFFSET
        // repite y saltea filas entre páginas.
        //
        // El desempate también va DESC: dentro del mismo instante, la última
        // cargada es la de `numero` más alto, así que ascendente daría vuelta el
        // "lo último arriba" justo en el caso que el desempate viene a resolver.
        .orderBy(desc(inscripciones.createdAt), desc(inscripciones.numero))
        .limit(limit)
        .offset(offset),
    () =>
      // Sin el join a viajes: el filtro por viaje se resuelve con
      // `inscripciones.viaje_id` y contar no necesita el código ni el nombre.
      db.select({ n: count() }).from(inscripciones).where(where).then(totalDe)
  );
}

/**
 * Detalle por el correlativo del código público INS-000123 (`codigoInscripcion`
 * / `parsearCodigoInscripcion` en el dominio). La ruta nace con slug: el uuid de
 * la ficha no aparece nunca en la URL.
 */
export async function getInscripcionByNumero(
  numero: number
): Promise<InscripcionDetalle | null> {
  const filas = await db
    .select({
      inscripcion: inscripciones,
      viajeCodigo: viajes.codigo,
      viajeNombre: viajes.nombre,
    })
    .from(inscripciones)
    .leftJoin(viajes, eq(inscripciones.viajeId, viajes.id))
    .where(and(eq(inscripciones.numero, numero), isNull(inscripciones.borradoEl)))
    .limit(1);

  const fila = filas[0];
  if (!fila) return null;
  return { ...fila.inscripcion, viajeCodigo: fila.viajeCodigo, viajeNombre: fila.viajeNombre };
}

export type ResumenInscripciones = {
  total: number;
  porEstado: Record<InscripcionEstado, number>;
  porVariante: Record<Variante, number>;
};

const CLAVE_TOTAL = "total";
const claveEstado = (estado: InscripcionEstado) => `estado_${estado}`;
const claveVariante = (variante: Variante) => `variante_${variante}`;

/**
 * Los conteos de las StatCards y de los chips de filtro. Se agregan EN SQL sobre
 * TODO el universo filtrado, no sobre la página visible: contar en memoria lo
 * que trajo `listInscripciones` daría "3 recibidas" cuando hay 120.
 *
 * El filtro por estado se excluye del tipo a propósito (mismo criterio que
 * `resumenPagosGlobal`): los conteos por estado son justamente lo que deja
 * elegir un estado, así que filtrar por uno los volvería circulares —
 * mostrarían un único número y cero en todo lo demás.
 *
 * Todos los conteos salen en UN round-trip con `count(*) filter (where …)`, que
 * con neon-http importa: cada query es un viaje HTTPS propio y un `group by` por
 * estado más otro por variante serían dos.
 */
export async function resumenInscripciones(
  filtros: Omit<InscripcionFilters, "estado">
): Promise<ResumenInscripciones> {
  const conteo = (condicion: SQL) => sql<string>`count(*) filter (where ${condicion})`;

  const selecciones: Record<string, SQL<string>> = { [CLAVE_TOTAL]: sql<string>`count(*)` };
  for (const estado of INSCRIPCION_ESTADOS) {
    selecciones[claveEstado(estado)] = conteo(eq(inscripciones.estado, estado));
  }
  for (const variante of VARIANTES) {
    selecciones[claveVariante(variante)] = conteo(eq(inscripciones.variante, variante));
  }

  const filas = await db
    .select(selecciones)
    .from(inscripciones)
    .where(condicionesInscripciones(filtros));

  // `count` vuelve como bigint y el driver lo entrega en string.
  const fila = filas[0];
  const leer = (clave: string) => Number(fila?.[clave] ?? 0);

  return {
    total: leer(CLAVE_TOTAL),
    porEstado: Object.fromEntries(
      INSCRIPCION_ESTADOS.map((estado) => [estado, leer(claveEstado(estado))])
    ) as Record<InscripcionEstado, number>,
    porVariante: Object.fromEntries(
      VARIANTES.map((variante) => [variante, leer(claveVariante(variante))])
    ) as Record<Variante, number>,
  };
}

/** Viajes que ya recibieron al menos una inscripción (para el filtro de la bandeja). */
export async function viajesConInscripciones(): Promise<
  { id: string; codigo: string; nombre: string }[]
> {
  return db
    .selectDistinct({ id: viajes.id, codigo: viajes.codigo, nombre: viajes.nombre })
    .from(inscripciones)
    .innerJoin(viajes, eq(inscripciones.viajeId, viajes.id))
    .where(isNull(inscripciones.borradoEl))
    .orderBy(asc(viajes.codigo));
}
