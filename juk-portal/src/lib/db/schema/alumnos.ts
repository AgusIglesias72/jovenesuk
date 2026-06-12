import { pgTable, text, timestamp, pgEnum, uuid, date, integer, json } from "drizzle-orm/pg-core";

export const alumnoEstado = pgEnum("alumno_estado", [
  "pre_inscripto",
  "inscripto",
  "activo",
  "viajando",
  "finalizado",
  "baja",
]);

/** Canal de ingreso del alumno al sistema (alimenta el Paso 0 del tablero). */
export const canalAlta = pgEnum("canal_alta", ["webhook", "alta_manual"]);

export const condicionFiscal = pgEnum("condicion_fiscal", [
  "consumidor_final",
  "responsable_inscripto",
  "monotributo",
  "exento",
  "otro",
]);

/**
 * Alumno — el customer-end-user del sistema.
 * Datos cargados inicialmente vía webhook del Google Form (Application Form JUK).
 * Datos personales DEBEN coincidir exactamente con pasaporte (PRD §5.3).
 */
export const alumnos = pgTable("alumnos", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Personales (como figuran en pasaporte)
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fechaNacimiento: date("fecha_nacimiento", { mode: "date" }).notNull(),
  dni: text("dni").notNull(),
  numeroPasaporte: text("numero_pasaporte").notNull(),
  fechaVencimientoPasaporte: date("fecha_vencimiento_pasaporte", { mode: "date" }).notNull(),
  // US-18: los cambios de datos de pasaporte quedan marcados con fecha
  // (impactan la verificación de la Immigration Letter).
  pasaporteActualizadoAt: timestamp("pasaporte_actualizado_at"),

  // Contacto del alumno
  telefonoAlumno: text("telefono_alumno"),
  emailAlumno: text("email_alumno"),
  alergiasSalud: text("alergias_salud"),  // confidencial

  // Tutor 1 (siempre requerido)
  tutor1Nombre: text("tutor1_nombre").notNull(),
  tutor1Celular: text("tutor1_celular").notNull(),
  tutor1Email: text("tutor1_email").notNull(),

  // Tutor 2 (opcional)
  tutor2Nombre: text("tutor2_nombre"),
  tutor2Celular: text("tutor2_celular"),
  tutor2Email: text("tutor2_email"),

  // Facturación (sólo visible para admins JUK — enforcement en lib/domain)
  facturacion: json("facturacion").$type<DatosFacturacion | null>(),

  // Preferencias del programa (no se cambian por viaje, son del alumno)
  preferenciasAlojamiento: text("preferencias_alojamiento"),
  nivelInglesAutoevaluacion: text("nivel_ingles_autoevaluacion"),

  estado: alumnoEstado("estado").default("pre_inscripto").notNull(),

  canalAlta: canalAlta("canal_alta").default("alta_manual").notNull(),
  fechaAlta: timestamp("fecha_alta").defaultNow().notNull(),
  procesadoPor: uuid("procesado_por"),  // FK lazy a users.id

  // Credenciales del Portal de Familias (US-19b): se generan al crear el
  // alumno; el ENVÍO es acción manual del admin. 1 cuenta por grupo familiar
  // (email del Tutor 1, MIN-07).
  familiaUserId: uuid("familia_user_id"),
  accesoFamiliaEnviadoAt: timestamp("acceso_familia_enviado_at"),

  notasInternas: text("notas_internas"),

  // Baja
  fechaBaja: timestamp("fecha_baja"),
  motivoBaja: text("motivo_baja"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Alumno = typeof alumnos.$inferSelect;
export type NewAlumno = typeof alumnos.$inferInsert;

export type DatosFacturacion = {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  cuilCuit: string;
  condicionFiscal: "consumidor_final" | "responsable_inscripto" | "monotributo" | "exento" | "otro";
};
