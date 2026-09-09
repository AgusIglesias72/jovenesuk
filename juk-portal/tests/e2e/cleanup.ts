import { and, eq, inArray, like, ne, or } from "drizzle-orm";

import { db } from "../../src/lib/db";
import {
  alumnos,
  asignaciones,
  colegios,
  consultas,
  groupLeaders,
  prospectos,
  suscriptores,
  users,
  viajes,
} from "../../src/lib/db/schema";

import { COLEGIO_E2E } from "./helpers";

/**
 * Limpieza de los artefactos que generan los E2E (la suite no muta datos
 * reales). Patrones inconfundibles, alineados con los generadores de
 * tests/e2e/helpers.ts:
 *   - viajes:    codigo  LIKE 'UK-2099-%'        (año 2099 → siempre de test)
 *   - alumnos:   tutor1_email 'tutor-…@example.com' / 'tutor*.…@e2e.jovenesenuk.com' o dni 'E2E-%'
 *   - colegios:  nombre  LIKE 'Colegio E2E %' (menos el colegio base COLEGIO_E2E)
 *   - GLs:       email   LIKE 'gl-%@example.com'
 *   - usuarios:  rol familia con esos emails de tutor + cuentas 'e2e+%'
 *   - leads:     consultas/suscriptores con email 'e2e+%' o LIKE '%@e2e.example.com'
 *
 * NO toca datos reales ni el seed [DEMO] (viajes UK-2026-*, dni DEMO-*, etc.).
 * Borra en orden de FK: cuotas/pasos_alumno/pasos_viaje/group_leaders_viaje/
 * colegio_documento_config cascadean solos; asignaciones (RESTRICT) y
 * viajes→colegios se borran explícitamente antes que sus padres.
 */
export async function cleanupE2EData() {
  const e2eViaje = like(viajes.codigo, "UK-2099-%");
  const e2eAlumno = or(
    like(alumnos.tutor1Email, "tutor-%@example.com"),
    like(alumnos.tutor1Email, "tutor%.%@e2e.jovenesenuk.com"),
    like(alumnos.dni, "E2E-%")
  );
  // Incluye los colegios que nacen al "convertir" un prospecto (heredan su
  // nombre). El colegio base lo crea auth.setup.ts y debe sobrevivir: sin él,
  // la corrida siguiente no puede crear viajes.
  const e2eColegio = and(
    or(like(colegios.nombre, "Colegio E2E %"), like(colegios.nombre, "Prospecto E2E %")),
    ne(colegios.nombre, COLEGIO_E2E)
  );
  const e2eGl = like(groupLeaders.email, "gl-%@example.com");

  const vids = (await db.select({ id: viajes.id }).from(viajes).where(e2eViaje)).map((r) => r.id);
  const aids = (await db.select({ id: alumnos.id }).from(alumnos).where(e2eAlumno)).map((r) => r.id);
  const cids = (await db.select({ id: colegios.id }).from(colegios).where(e2eColegio)).map((r) => r.id);
  const gids = (await db.select({ id: groupLeaders.id }).from(groupLeaders).where(e2eGl)).map((r) => r.id);

  // asignaciones primero (RESTRICT hacia alumnos/viajes); cuotas y pasos_alumno cascadean.
  if (vids.length) await db.delete(asignaciones).where(inArray(asignaciones.viajeId, vids));
  if (aids.length) await db.delete(asignaciones).where(inArray(asignaciones.alumnoId, aids));

  // viajes (cascadea pasos_viaje + group_leaders_viaje) y group_leaders.
  if (vids.length) await db.delete(viajes).where(inArray(viajes.id, vids));
  if (gids.length) await db.delete(groupLeaders).where(inArray(groupLeaders.id, gids));

  // Prospectos de CRM ANTES de colegios: prospectos.colegioId → colegios (RESTRICT).
  // Borrar el prospecto cascadea sus prospecto_comunicaciones.
  const pdel = await db
    .delete(prospectos)
    .where(like(prospectos.nombre, "Prospecto E2E %"))
    .returning({ id: prospectos.id });

  // alumnos (ya sin asignaciones) y colegios (ya sin viajes ni prospectos; cascadea su config documental).
  if (aids.length) await db.delete(alumnos).where(inArray(alumnos.id, aids));
  if (cids.length) await db.delete(colegios).where(inArray(colegios.id, cids));

  // Cuentas de familia de test (sessions/accounts cascadean).
  await db
    .delete(users)
    .where(
      and(
        eq(users.role, "familia"),
        or(
          like(users.email, "tutor-%@example.com"),
          like(users.email, "tutor%.%@e2e.jovenesenuk.com")
        )
      )
    );

  // Usuarios creados por los specs de acceso/hardening: prefijo 'e2e+' (o
  // dominio @e2e.example.com), inconfundible y de cualquier rol.
  await db
    .delete(users)
    .where(or(like(users.email, "e2e+%"), like(users.email, "%@e2e.example.com")));

  // Leads de la web pública (sin FK hacia el resto).
  await db
    .delete(consultas)
    .where(or(like(consultas.email, "e2e+%"), like(consultas.email, "%@e2e.example.com")));
  await db
    .delete(suscriptores)
    .where(or(like(suscriptores.email, "e2e+%"), like(suscriptores.email, "%@e2e.example.com")));

  return {
    viajes: vids.length,
    alumnos: aids.length,
    colegios: cids.length,
    groupLeaders: gids.length,
    prospectos: pdel.length,
  };
}

// Ejecución directa: `tsx tests/e2e/cleanup.ts` (con .env.local sourceado).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("tests/e2e/cleanup.ts")) {
  cleanupE2EData()
    .then((c) => {
      console.error("Limpieza E2E:", c);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
