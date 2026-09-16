import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  INSCRIPCION_ESTADOS,
  VARIANTES,
  VARIANTE_POR_DEFECTO,
} from "@/lib/domain/inscripciones/schema";

import { alumnos } from "./alumnos";
import { prospectoComunicaciones } from "./prospectos";
import { viajes } from "./viajes";

/**
 * Application Form propio — TABLA DE ATERRIZAJE.
 *
 * La ficha se persiste SIEMPRE acá antes de intentar crear al alumno, y por eso
 * la tabla existe en vez de escribir directo en `alumnos`: el formulario es
 * público y una carga anónima no puede crear ni engancharse a una cuenta de
 * familia sin que un humano lo mire. Si el alta automática no corresponde
 * (llegó sin token válido, el email del tutor ya tiene alumnos, el viaje no
 * tiene cupo), la ficha queda igual con su `estado` y su `motivo`, la bandeja la
 * muestra y el equipo decide. Nada se pierde y nada se cuela.
 *
 * Los valores de los enums salen del dominio
 * (`src/lib/domain/inscripciones/schema.ts`) — única fuente de verdad compartida
 * con el formulario y con la bandeja.
 */

export const inscripcionEstado = pgEnum("inscripcion_estado", INSCRIPCION_ESTADOS);

/** Solo estética: la ficha que se carga es la misma en las tres variantes. */
export const varianteFormulario = pgEnum("variante_formulario", VARIANTES);

export const inscripciones = pgTable(
  "inscripciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Correlativo que alimenta el código público INS-000123 (`codigoInscripcion`). */
    numero: integer("numero").generatedByDefaultAsIdentity().unique(),

    // Origen: la invitación que trajo esta ficha; NULL = carga sin token (esas
    // entran en requiere_revision). ON DELETE SET NULL porque si se purga la
    // comunicación, la inscripción sobrevive sin su rastro de campaña.
    comunicacionId: uuid("comunicacion_id").references(() => prospectoComunicaciones.id, {
      onDelete: "set null",
    }),

    /** sha256 del token con el que se cargó. NUNCA el token en claro. */
    tokenHash: text("token_hash"),

    variante: varianteFormulario("variante").notNull().default(VARIANTE_POR_DEFECTO),

    /**
     * DERIVADO del token server-side, jamás del formulario: si viajara en el
     * body, quien tenga el link podría inscribir a cualquiera en cualquier viaje.
     */
    viajeId: uuid("viaje_id").references(() => viajes.id),

    // ── La ficha (los mismos campos que acepta el webhook del Google Form) ───

    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    /**
     * `mode: "string"` y no `"date"` como en `alumnos`: acá se guarda lo que la
     * familia tipeó, tal cual (AAAA-MM-DD). Convertirlo a `Date` en el borde
     * mete el huso horario del navegador y corre un cumpleaños un día; la
     * conversión ocurre recién al crear al alumno, del lado del server.
     */
    fechaNacimiento: date("fecha_nacimiento", { mode: "string" }).notNull(),
    /** Siempre en dígitos (TEC-12: lo normaliza `soloDigitos` en el dominio). */
    dni: text("dni").notNull(),
    numeroPasaporte: text("numero_pasaporte").notNull(),
    fechaVencimientoPasaporte: date("fecha_vencimiento_pasaporte", { mode: "string" }).notNull(),

    telefonoAlumno: text("telefono_alumno"),
    emailAlumno: text("email_alumno"),
    alergiasSalud: text("alergias_salud"),  // confidencial

    tutor1Nombre: text("tutor1_nombre").notNull(),
    tutor1Celular: text("tutor1_celular").notNull(),
    tutor1Email: text("tutor1_email").notNull(),

    preferenciasAlojamiento: text("preferencias_alojamiento"),
    nivelInglesAutoevaluacion: text("nivel_ingles_autoevaluacion"),

    // ── Ciclo de vida ───────────────────────────────────────────────────────

    estado: inscripcionEstado("estado").notNull().default("recibida"),

    /** El alumno creado o reusado. NULL mientras el alta no se resolvió. */
    alumnoId: uuid("alumno_id").references(() => alumnos.id),

    /**
     * El motivo REAL de por qué no se pudo procesar ("DNI ya cargado", "el email
     * del tutor ya tiene alumnos de otro apellido", "viaje sin cupo", el error).
     * Sin esto la bandeja muestra un fallo mudo y nadie sabe qué hacer.
     */
    motivo: text("motivo"),

    // ── Privacidad ──────────────────────────────────────────────────────────
    // Todo desde la migración inicial: agregarlo después cuesta otra migración
    // sobre una base que ya tiene datos reales de familias.

    /** Versión de la política que se mostró (`VERSION_CONSENTIMIENTO`). */
    consentimientoVersion: text("consentimiento_version").notNull(),
    /** sha256 del texto EXACTO que se mostró: prueba a qué se aceptó. */
    consentimientoTextoHash: text("consentimiento_texto_hash").notNull(),
    consentimientoEl: timestamp("consentimiento_el").notNull(),
    // No hay columna con la IP del consentimiento. Es una decisión explícita de
    // privacidad: la versión y el hash del texto ya prueban a qué se aceptó, y
    // guardar la IP de una familia sumaría un dato personal que no usamos.

    borradoEl: timestamp("borrado_el"),
    borradoPor: uuid("borrado_por"),  // FK lazy a users.id
    motivoBorrado: text("motivo_borrado"),
    /** Cuándo se vaciaron los datos personales de la fila (retención). */
    datosPurgadosEl: timestamp("datos_purgados_el"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Los dos unique son PARCIALES a propósito: son candados contra el doble
  // envío, no reglas eternas. Un unique total dejaría la invitación (o el DNI)
  // quemados para siempre, y la familia no podría volver a cargar después de
  // que el equipo anule una ficha equivocada.
  (t) => [
    // Una respuesta VIVA por invitación: anular es lo único que libera el link.
    uniqueIndex("uniq_inscripcion_comunicacion")
      .on(t.comunicacionId)
      .where(sql`${t.estado} <> 'anulada'`),
    // Frena el doble clic también en el camino SIN token, donde no hay
    // invitación que reservar. Solo sobre los estados todavía en juego: una vez
    // procesada o duplicada, el candado pasa a ser el unique de `alumnos.dni`.
    uniqueIndex("uniq_inscripcion_dni_viva")
      .on(t.dni)
      .where(sql`${t.estado} in ('recibida', 'requiere_revision')`),
    index("idx_inscripciones_estado_creado").on(t.estado, t.createdAt),
  ]
);

export type Inscripcion = typeof inscripciones.$inferSelect;
export type NewInscripcion = typeof inscripciones.$inferInsert;
