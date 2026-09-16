import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  date,
  index,
  integer,
  json,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const alumnoEstado = pgEnum("alumno_estado", [
  "pre_inscripto",
  "inscripto",
  "activo",
  "viajando",
  "finalizado",
  "baja",
]);

/**
 * Canal de ingreso del alumno al sistema (alimenta el Paso 0 del tablero).
 * `formulario_web` es el Application Form propio; `webhook` queda para las
 * fichas que todavía entran por el Google Form.
 */
export const canalAlta = pgEnum("canal_alta", ["webhook", "alta_manual", "formulario_web"]);

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
export const alumnos = pgTable(
  "alumnos",
  {
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
  },
  // El DNI es la identidad del alumno y el slug de /alumnos/[dni]: lo leen
  // getAlumnoByDni (ficha, portal de familias) y la idempotencia del webhook,
  // y duplicarlo haría que la ficha resuelva al primero que aparezca.
  // familia_user_id es el filtro de TODO el portal de familias
  // (getAlumnosDeFamilia, alumnosActivosDeCuenta, la baja de la cuenta).
  // canal_alta lo leen el filtro y los conteos por canal de la bandeja de
  // inscripciones, sobre una tabla que crece con cada alta.
  (t) => [
    uniqueIndex("uniq_alumnos_dni").on(t.dni),
    index("idx_alumnos_familia_user").on(t.familiaUserId),
    index("idx_alumnos_canal_alta").on(t.canalAlta),
  ]
);

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
