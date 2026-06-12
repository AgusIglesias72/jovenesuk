/**
 * Seed de CUENTAS TEST + DATASET DEMO.
 *
 * Crea (idempotente: borra lo [DEMO] y lo re-crea):
 *  - 2 cuentas de test con contraseña FIJA conocida (validación manual + E2E):
 *      test.superadmin@jovenesenuk.com  → super_admin
 *      test.admin@jovenesenuk.com       → admin_juk
 *    Password: env SEED_TEST_PASSWORD o el default de abajo. SOLO para dev.
 *  - Dataset demo que cubre todas las ramas del negocio: 4 colegios (configs
 *    documentales distintas, tipos de entrada eta/visa/ninguna), 3 GLs (police
 *    checks en 3 estados), 4 viajes (grupal/individual × 4 orígenes × estados),
 *    6 alumnos (edades 15-19, pasaportes ok/en alerta/corto) y asignaciones con
 *    los tableros M6 generados por el MISMO dominio que usa la app.
 *
 * Uso:  npm run db:seed:demo   (cargar .env.local antes — ver docs 04)
 */

import { eq, like } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { colegios, colegioDocumentoConfig } from "@/lib/db/schema/colegios";
import { groupLeaders } from "@/lib/db/schema/grupos-leaders";
import { viajes } from "@/lib/db/schema/viajes";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { crearPasosParaAsignacion } from "@/lib/db/queries/pasos-alumno";
import { getConfigDocumental, upsertConfigDocumental } from "@/lib/db/queries/colegios";
import { edadAlInicioDelViaje, pasosIniciales } from "@/lib/domain/pasos";

const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD ?? "JukTest2026!";

const CUENTAS_TEST = [
  { email: "test.superadmin@jovenesenuk.com", name: "Test Súper", role: "super_admin" as const },
  { email: "test.admin@jovenesenuk.com", name: "Test Admin", role: "admin_juk" as const },
];

const d = (iso: string) => new Date(iso);

async function seedCuentasTest(): Promise<string | null> {
  let superAdminId: string | null = null;
  for (const cuenta of CUENTAS_TEST) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, cuenta.email)).limit(1);
    if (existing.length > 0) {
      console.log(`⏭️  ${cuenta.email} ya existe`);
      if (cuenta.role === "super_admin") superAdminId = existing[0]!.id;
      continue;
    }
    await auth.api.signUpEmail({
      body: { email: cuenta.email, password: TEST_PASSWORD, name: cuenta.name },
    });
    await db
      .update(users)
      .set({ role: cuenta.role, emailVerified: true, subRolAdmin: "Testing" })
      .where(eq(users.email, cuenta.email));
    const row = await db.select({ id: users.id }).from(users).where(eq(users.email, cuenta.email)).limit(1);
    if (cuenta.role === "super_admin") superAdminId = row[0]!.id;
    console.log(`✅ Cuenta test: ${cuenta.email} (${cuenta.role})`);
  }
  return superAdminId;
}

async function wipeDemo() {
  // Orden: viajes primero (cascade: asignaciones → pasos_alumno, gl_viaje, pasos_viaje)
  await db.delete(viajes).where(like(viajes.nombre, "%[DEMO]%"));
  await db.delete(alumnos).where(like(alumnos.dni, "DEMO-%"));
  await db.delete(colegios).where(like(colegios.nombre, "%[DEMO]%"));
  await db.delete(groupLeaders).where(like(groupLeaders.email, "%@demo.jovenesenuk.com"));
  console.log("🧹 Datos [DEMO] anteriores eliminados");
}

async function main() {
  console.log("🌱 JUK Portal · Seed DEMO\n");

  const userId = await seedCuentasTest();
  if (!userId) throw new Error("No se pudo resolver el super_admin de test");

  await wipeDemo();

  const contacto = (n: string) => ({ nombre: n, email: "contacto@demo.jovenesenuk.com", telefono: "+44 20 0000 0000" });

  // ── Colegios ──────────────────────────────────────────────────────
  const [wimbledon] = await db.insert(colegios).values({
    nombre: "Wimbledon School of English [DEMO]",
    tipo: "destino", pais: "reino_unido", ciudad: "Londres",
    contactoAcademico: contacto("Emma Clarke"), contactoAdministrativo: contacto("Olivia Bennett"),
    cursosDisponibles: ["General English", "Exam Prep"],
    tiposAlojamiento: ["familia_anfitriona", "residencia"],
    tipoEntradaRequerida: "eta",
    createdBy: userId,
  }).returning();
  // Wimbledon exige TODO (el caso "pide test y parental consent")
  await upsertConfigDocumental(wimbledon!.id, {
    application_form: "requerido", test_nivel: "requerido", parental_consent: "requerido",
    confirmation_letter: "requerido", visa_immigration_letter: "requerido",
  }, userId);

  const [dublin] = await db.insert(colegios).values({
    nombre: "Dublin Language Centre [DEMO]",
    tipo: "destino", pais: "irlanda", ciudad: "Dublín",
    contactoAcademico: contacto("Sean Murphy"), contactoAdministrativo: contacto("Aoife Kelly"),
    cursosDisponibles: ["General English"], tiposAlojamiento: ["familia_anfitriona"],
    tipoEntradaRequerida: "ninguna",  // Irlanda: ni ETA ni VISA → C1 = N/A
    createdBy: userId,
  }).returning();

  const [toronto] = await db.insert(colegios).values({
    nombre: "Toronto Academy [DEMO]",
    tipo: "destino", pais: "canada", ciudad: "Toronto",
    contactoAcademico: contacto("Liam Chen"), contactoAdministrativo: contacto("Ava Wilson"),
    cursosDisponibles: ["Academic Year"], tiposAlojamiento: ["residencia"],
    tipoEntradaRequerida: "visa",  // VISA obligatoria → C1 = N/A (flujo v2)
    createdBy: userId,
  }).returning();

  const [nea] = await db.insert(colegios).values({
    nombre: "NEA Argentina [DEMO]",
    tipo: "cliente", pais: "argentina", ciudad: "Buenos Aires",
    contactoAcademico: contacto("Marcela Pérez"), contactoAdministrativo: contacto("Hugo Díaz"),
    cursosDisponibles: [], tiposAlojamiento: [], tipoEntradaRequerida: "ninguna",
    createdBy: userId,
  }).returning();

  console.log("✅ 4 colegios (Wimbledon exige todo · Dublín sin entrada · Toronto VISA · NEA cliente)");

  // ── Group Leaders (police checks en 3 estados) ────────────────────
  const gls = await db.insert(groupLeaders).values([
    {
      nombre: "Carla", apellido: "Suárez", email: "carla@demo.jovenesenuk.com",
      policeCheckEstado: "aprobado",
      policeCheckFechaEmision: d("2026-03-01"), policeCheckFechaVencimiento: d("2027-03-01"),
    },
    { nombre: "Diego", apellido: "Funes", email: "diego@demo.jovenesenuk.com", policeCheckEstado: "en_tramite" },
    {
      nombre: "Marta", apellido: "Ríos", email: "marta@demo.jovenesenuk.com",
      policeCheckEstado: "vencido",
      policeCheckFechaEmision: d("2024-01-10"), policeCheckFechaVencimiento: d("2026-01-10"),
    },
  ]).returning();
  console.log("✅ 3 GLs (aprobado / en trámite / vencido)");

  // ── Viajes (4 combinaciones de tipo × origen × estado) ────────────
  const [vWimbledon] = await db.insert(viajes).values({
    codigo: "UK-2026-SEP-WIMBLEDON", nombre: "Wimbledon Septiembre [DEMO]",
    tipo: "grupal", origen: "representante_independiente",
    fechaInicio: d("2026-09-07"), fechaFin: d("2026-09-21"),
    paisDestino: "reino_unido", colegioDestinoId: wimbledon!.id,
    curso: "General English", tipoAlojamientoSolicitado: "familia_anfitriona",
    cantidadGroupLeaders: 2, capacidadMaxima: 24, capacidadMinima: 5,
    comisionAgenciaPct: 6, feeRepresentante: "120.00",
    estado: "inscripcion_abierta", createdBy: userId,
  }).returning();

  const [vDublin] = await db.insert(viajes).values({
    codigo: "UK-2026-OCT-DUBLIN", nombre: "Dublín Octubre [DEMO]",
    tipo: "grupal", origen: "instituto",
    fechaInicio: d("2026-10-05"), fechaFin: d("2026-10-19"),
    paisDestino: "irlanda", colegioDestinoId: dublin!.id,
    curso: "General English", tipoAlojamientoSolicitado: "familia_anfitriona",
    cantidadGroupLeaders: 1, capacidadMaxima: 12, capacidadMinima: 5,
    comisionAgenciaPct: 6,
    estado: "confirmado", createdBy: userId,
  }).returning();

  const [vNea] = await db.insert(viajes).values({
    codigo: "UK-2027-JAN-NEALONDON", nombre: "NEA Londres Enero [DEMO]",
    tipo: "grupal", origen: "colegio_cliente", colegioClienteId: nea!.id,
    fechaInicio: d("2027-01-11"), fechaFin: d("2027-01-25"),
    paisDestino: "reino_unido", colegioDestinoId: wimbledon!.id,
    curso: "Exam Prep", tipoAlojamientoSolicitado: "residencia",
    cantidadGroupLeaders: 1, capacidadMaxima: 12, capacidadMinima: 5,
    comisionAgenciaPct: 6,
    estado: "inscripcion_abierta", createdBy: userId,
  }).returning();

  const [vToronto] = await db.insert(viajes).values({
    codigo: "UK-2026-AUG-TORONTO", nombre: "Individual Toronto [DEMO]",
    tipo: "individual", origen: "juk_directo",
    fechaInicio: d("2026-08-03"), fechaFin: d("2026-11-27"),
    paisDestino: "canada", colegioDestinoId: toronto!.id,
    curso: "Academic Year", tipoAlojamientoSolicitado: "residencia",
    cantidadGroupLeaders: 0, capacidadMaxima: 1, capacidadMinima: 1,
    estado: "confirmado", createdBy: userId,
  }).returning();

  console.log("✅ 4 viajes (independiente UK · instituto IRL · colegio cliente · individual JUK directo)");

  // ── Alumnos (edades y pasaportes variados) ────────────────────────
  const tutor = { tutor1Nombre: "Tutor Demo", tutor1Celular: "+54 9 11 0000-0000", tutor1Email: "tutor@demo.jovenesenuk.com" };
  const als = await db.insert(alumnos).values([
    // 15 al inicio de sep-2026 → A3 versión <16, D1 activo
    { nombre: "Lola", apellido: "Demo Quince", fechaNacimiento: d("2011-03-15"), dni: "DEMO-1",
      numeroPasaporte: "AAD111111", fechaVencimientoPasaporte: d("2032-01-01"), estado: "inscripto", ...tutor },
    // 16 → A3 versión 16-17; pasaporte en ALERTA conservadora (vence dic-2026)
    { nombre: "Benja", apellido: "Demo Dieciséis", fechaNacimiento: d("2010-05-20"), dni: "DEMO-2",
      numeroPasaporte: "AAD222222", fechaVencimientoPasaporte: d("2026-12-15"), estado: "inscripto", ...tutor },
    // 17 → viaje Dublín (instituto, sin ETA)
    { nombre: "Mora", apellido: "Demo Diecisiete", fechaNacimiento: d("2008-11-02"), dni: "DEMO-3",
      numeroPasaporte: "AAD333333", fechaVencimientoPasaporte: d("2031-06-30"), estado: "inscripto", ...tutor },
    // 19 → individual Toronto: A3/D1 N/A por edad, D2 N/A por individual, C1 N/A por visa
    { nombre: "Tomi", apellido: "Demo Adulto", fechaNacimiento: d("2007-01-08"), dni: "DEMO-4",
      numeroPasaporte: "AAD444444", fechaVencimientoPasaporte: d("2033-09-01"), estado: "inscripto",
      emailAlumno: "tomi@demo.jovenesenuk.com", ...tutor },
    // Sin asignar, elegible
    { nombre: "Cata", apellido: "Demo Elegible", fechaNacimiento: d("2009-07-22"), dni: "DEMO-5",
      numeroPasaporte: "AAD555555", fechaVencimientoPasaporte: d("2030-03-03"), estado: "pre_inscripto", ...tutor },
    // Pasaporte que vence ANTES del fin de Wimbledon → dispara la advertencia al asignar
    { nombre: "Juan", apellido: "Demo Pasaporte", fechaNacimiento: d("2010-09-09"), dni: "DEMO-6",
      numeroPasaporte: "AAD666666", fechaVencimientoPasaporte: d("2026-09-10"), estado: "pre_inscripto", ...tutor },
  ]).returning();
  console.log("✅ 6 alumnos (edades 15-19, pasaportes ok / en alerta / corto)");

  // ── Asignaciones + tableros M6 (usando el dominio real) ───────────
  const asignar = async (alumno: typeof als[number], viaje: NonNullable<typeof vWimbledon>) => {
    const [asig] = await db.insert(asignaciones).values({ alumnoId: alumno.id, viajeId: viaje.id }).returning();
    const colegio = [wimbledon, dublin, toronto].find((c) => c!.id === viaje.colegioDestinoId)!;
    const pasos = pasosIniciales({
      configDocumental: await getConfigDocumental(viaje.colegioDestinoId),
      tipoEntrada: colegio!.tipoEntradaRequerida,
      origenViaje: viaje.origen,
      tipoViaje: viaje.tipo,
      edadAlInicio: edadAlInicioDelViaje(alumno.fechaNacimiento, viaje.fechaInicio),
      canalAlta: "alta_manual",
    });
    await crearPasosParaAsignacion(asig!.id, pasos, alumno.fechaAlta, userId);
    return asig!;
  };

  const [lola, benja, mora, tomi] = als;
  const asigLola = await asignar(lola!, vWimbledon!);
  await asignar(benja!, vWimbledon!);
  await asignar(mora!, vDublin!);
  await asignar(tomi!, vToronto!);

  // Variedad de estados en el tablero de Lola: A1 completado, B1 en progreso,
  // C1 en trámite, A3 enviado. (Benja queda virgen para ver el estado inicial.)
  const pasosLola = await db.select().from(pasosAlumno).where(eq(pasosAlumno.asignacionId, asigLola.id));
  for (const p of pasosLola) {
    if (p.codigo === "paso_0") {
      await db.update(pasosAlumno).set({ estado: "completado", fechaCompletado: lola!.fechaAlta }).where(eq(pasosAlumno.id, p.id));
    } else if (p.codigo === "a1") {
      await db.update(pasosAlumno).set({ estado: "completado", fechaCompletado: d("2026-06-01"), metadata: { fechaEntrega: "2026-06-01" }, updatedBy: userId }).where(eq(pasosAlumno.id, p.id));
    } else if (p.codigo === "b1") {
      await db.update(pasosAlumno).set({ estado: "en_progreso", metadata: { cuotasPagadas: 2, cuotasTotales: 5 }, updatedBy: userId }).where(eq(pasosAlumno.id, p.id));
    } else if (p.codigo === "c1") {
      await db.update(pasosAlumno).set({ estado: "en_progreso", metadata: { subEstado: "en_tramite" }, updatedBy: userId }).where(eq(pasosAlumno.id, p.id));
    } else if (p.codigo === "c2") {
      await db.update(pasosAlumno).set({ estado: "bloqueado", metadata: { bloqueadoPor: "b1" } }).where(eq(pasosAlumno.id, p.id));
    } else if (p.codigo === "a3") {
      await db.update(pasosAlumno).set({ estado: "en_progreso", metadata: { version: "menor_16", subEstado: "enviado" }, updatedBy: userId }).where(eq(pasosAlumno.id, p.id));
    }
  }

  // GLs del viaje Wimbledon (Carla principal aprobada + Marta vencida → paso 5 bloqueado)
  const { groupLeadersViaje } = await import("@/lib/db/schema/pasos-viaje");
  await db.insert(groupLeadersViaje).values([
    { viajeId: vWimbledon!.id, groupLeaderId: gls[0]!.id, esPrincipal: true },
    { viajeId: vWimbledon!.id, groupLeaderId: gls[2]!.id, esPrincipal: false },
  ]);

  console.log("✅ 4 asignaciones con tableros M6 + GLs del viaje (police checks mixtos)");

  console.log("\n" + "=".repeat(62));
  console.log("CUENTAS DE TEST (contraseña fija — solo dev)");
  console.log("=".repeat(62));
  for (const c of CUENTAS_TEST) console.log(`  ${c.email}  ·  ${TEST_PASSWORD}  (${c.role})`);
  console.log("=".repeat(62));
  console.log(`
Qué validar con el dataset:
  · Wimbledon Septiembre: tablero completo (Lola avanzada / Benja inicial),
    Benja con pasaporte EN ALERTA, GL con police check vencido → M7 bloqueado.
  · Asignar a "Juan Demo Pasaporte" → advertencia confirmable de pasaporte.
  · Dublín (instituto, IRL): C1 = N/A; B2 activo.
  · NEA Londres: B2 = N/A (colegio cliente, todo vía agencia).
  · Individual Toronto: capacidad 1, D2/C1/B2/A3/D1 en N/A, badge Individual.
  · Cata Demo Elegible queda libre para probar el flujo de asignación.
`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal seed-demo error:", err);
  process.exit(1);
});
