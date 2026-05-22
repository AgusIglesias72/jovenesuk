CREATE TYPE "public"."alerta_nivel" AS ENUM('critica', 'alta', 'media', 'info');--> statement-breakpoint
CREATE TYPE "public"."alerta_tipo" AS ENUM('eta_rechazado', 'pasaporte_vence_antes_viaje', 'pasaporte_vence_pronto', 'mora_cuota', 'mora_mayor_7_dias', 'viaje_proximo_paso_pendiente', 'viaje_proximo_paso_bloqueado', 'parental_consent_desactualizado', 'police_check_vencido', 'immigration_letter_tardia', 'viaje_sin_cupo_minimo', 'otro');--> statement-breakpoint
CREATE TYPE "public"."alumno_estado" AS ENUM('pre_inscripto', 'inscripto', 'activo', 'viajando', 'finalizado', 'baja');--> statement-breakpoint
CREATE TYPE "public"."condicion_fiscal" AS ENUM('consumidor_final', 'responsable_inscripto', 'monotributo', 'exento', 'otro');--> statement-breakpoint
CREATE TYPE "public"."asignacion_estado" AS ENUM('activa', 'viajando', 'finalizada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."audit_accion" AS ENUM('login', 'logout', 'login_failed', 'create', 'update', 'delete', 'soft_delete', 'asignar_a_viaje', 'desasignar_de_viaje', 'cambio_estado_paso', 'cambio_estado_viaje', 'registrar_pago', 'subir_documento');--> statement-breakpoint
CREATE TYPE "public"."colegio_estado" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."colegio_tipo" AS ENUM('destino', 'cliente');--> statement-breakpoint
CREATE TYPE "public"."pais" AS ENUM('reino_unido', 'irlanda', 'canada', 'malta', 'australia', 'argentina', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_alojamiento" AS ENUM('familia_anfitriona', 'residencia', 'campus', 'otro');--> statement-breakpoint
CREATE TYPE "public"."canal_pago" AS ENUM('agencia', 'presencial');--> statement-breakpoint
CREATE TYPE "public"."cuota_estado" AS ENUM('pendiente', 'pagada', 'vencida');--> statement-breakpoint
CREATE TYPE "public"."documento_categoria" AS ENUM('application_form', 'immigration_letter', 'parental_consent', 'accommodation_letter', 'eta_screenshot', 'autorizacion_escribano', 'certificado_psicofisico', 'police_check', 'e_ticket', 'comprobante_pago', 'comprobante_transporte', 'otro');--> statement-breakpoint
CREATE TYPE "public"."documento_entidad" AS ENUM('alumno', 'viaje', 'colegio', 'paso_alumno', 'paso_viaje', 'group_leader');--> statement-breakpoint
CREATE TYPE "public"."police_check_estado" AS ENUM('pendiente', 'en_tramite', 'aprobado', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin_juk', 'super_admin', 'representante', 'familia');--> statement-breakpoint
CREATE TYPE "public"."viaje_estado" AS ENUM('inscripcion_abierta', 'confirmado', 'en_curso', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."viaje_origen" AS ENUM('representante_independiente', 'instituto', 'colegio_cliente');--> statement-breakpoint
CREATE TYPE "public"."paso_estado" AS ENUM('pendiente', 'en_progreso', 'completado', 'bloqueado', 'na');--> statement-breakpoint
CREATE TYPE "public"."paso_tipo" AS ENUM('application_form', 'pagos', 'immigration_letter', 'test_nivel', 'parental_consent', 'accommodation_letter', 'eta', 'autorizacion_escribano', 'certificado_psicofisico', 'ultimo_pago_presencial');--> statement-breakpoint
CREATE TYPE "public"."paso_viaje_estado" AS ENUM('pendiente', 'en_progreso', 'completado', 'bloqueado');--> statement-breakpoint
CREATE TYPE "public"."paso_viaje_tipo" AS ENUM('pasajes', 'excursiones', 'transfers', 'tarjeta_transporte', 'police_checks');--> statement-breakpoint
CREATE TABLE "alertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nivel" "alerta_nivel" NOT NULL,
	"tipo" "alerta_tipo" NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"alumno_id" uuid,
	"viaje_id" uuid,
	"asignacion_id" uuid,
	"datos" json DEFAULT '{}'::json NOT NULL,
	"resuelta" boolean DEFAULT false NOT NULL,
	"fecha_resolucion" timestamp,
	"resuelta_por" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alumnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"fecha_nacimiento" date NOT NULL,
	"dni" text NOT NULL,
	"numero_pasaporte" text NOT NULL,
	"fecha_vencimiento_pasaporte" date NOT NULL,
	"telefono_alumno" text,
	"email_alumno" text,
	"alergias_salud" text,
	"tutor1_nombre" text NOT NULL,
	"tutor1_celular" text NOT NULL,
	"tutor1_email" text NOT NULL,
	"tutor2_nombre" text,
	"tutor2_celular" text,
	"tutor2_email" text,
	"facturacion" json,
	"preferencias_alojamiento" text,
	"nivel_ingles_autoevaluacion" text,
	"estado" "alumno_estado" DEFAULT 'pre_inscripto' NOT NULL,
	"fecha_alta" timestamp DEFAULT now() NOT NULL,
	"procesado_por" uuid,
	"notas_internas" text,
	"fecha_baja" timestamp,
	"motivo_baja" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asignaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"viaje_id" uuid NOT NULL,
	"estado" "asignacion_estado" DEFAULT 'activa' NOT NULL,
	"fecha_asignacion" timestamp DEFAULT now() NOT NULL,
	"fecha_cancelacion" timestamp,
	"motivo_cancelacion" text,
	CONSTRAINT "uniq_alumno_viaje" UNIQUE("alumno_id","viaje_id")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accion" "audit_accion" NOT NULL,
	"entidad_tipo" text,
	"entidad_id" uuid,
	"usuario_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"cambios" json,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colegios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "colegio_tipo" NOT NULL,
	"pais" "pais" NOT NULL,
	"ciudad" text NOT NULL,
	"contacto_academico" json NOT NULL,
	"contacto_administrativo" json NOT NULL,
	"contacto_alojamientos" json,
	"contacto_juniors" json,
	"application_form_url" text,
	"parental_consent_url" text,
	"parental_consent_year" integer,
	"parental_consent_updated_at" timestamp,
	"cursos_disponibles" json DEFAULT '[]'::json NOT NULL,
	"tipos_alojamiento" json DEFAULT '[]'::json NOT NULL,
	"requiere_certificado_psicofisico" boolean DEFAULT false NOT NULL,
	"comision_agencia_porcentaje" integer,
	"sitio_web" text,
	"notas" text,
	"estado" "colegio_estado" DEFAULT 'activo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignacion_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"es_ultima_cuota" integer DEFAULT 0 NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"moneda" text DEFAULT 'GBP' NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"fecha_pago_efectivo" timestamp,
	"canal" "canal_pago" NOT NULL,
	"estado" "cuota_estado" DEFAULT 'pendiente' NOT NULL,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad_tipo" "documento_entidad" NOT NULL,
	"entidad_id" uuid NOT NULL,
	"categoria" "documento_categoria" NOT NULL,
	"nombre_original" text NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"version_anio" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" uuid,
	CONSTRAINT "documentos_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
CREATE TABLE "group_leaders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text NOT NULL,
	"telefono" text,
	"documento" text,
	"police_check_estado" "police_check_estado" DEFAULT 'pendiente' NOT NULL,
	"police_check_url" text,
	"police_check_fecha_emision" date,
	"police_check_fecha_vencimiento" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_leaders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'admin_juk' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"origen" "viaje_origen" NOT NULL,
	"colegio_cliente_id" uuid,
	"pais_destino" "pais" NOT NULL,
	"colegio_destino_id" uuid NOT NULL,
	"curso" text NOT NULL,
	"tipo_alojamiento_solicitado" "tipo_alojamiento" NOT NULL,
	"cantidad_group_leaders" integer DEFAULT 1 NOT NULL,
	"capacidad_maxima" integer NOT NULL,
	"capacidad_minima" integer DEFAULT 5 NOT NULL,
	"estado" "viaje_estado" DEFAULT 'inscripcion_abierta' NOT NULL,
	"ultimo_pago_presencial" text DEFAULT 'si' NOT NULL,
	"notas_internas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viajes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pasos_alumno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignacion_id" uuid NOT NULL,
	"tipo" "paso_tipo" NOT NULL,
	"estado" "paso_estado" DEFAULT 'pendiente' NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"fecha_limite" date,
	"fecha_completado" timestamp,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "uniq_asignacion_paso_tipo" UNIQUE("asignacion_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "group_leaders_viaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viaje_id" uuid NOT NULL,
	"group_leader_id" uuid NOT NULL,
	"es_principal" text DEFAULT 'no' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_gl_viaje" UNIQUE("viaje_id","group_leader_id")
);
--> statement-breakpoint
CREATE TABLE "pasos_viaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viaje_id" uuid NOT NULL,
	"tipo" "paso_viaje_tipo" NOT NULL,
	"estado" "paso_viaje_estado" DEFAULT 'pendiente' NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "uniq_viaje_paso_tipo" UNIQUE("viaje_id","tipo")
);
--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_alumno_id_alumnos_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_asignacion_id_asignaciones_id_fk" FOREIGN KEY ("asignacion_id") REFERENCES "public"."asignaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_colegio_cliente_id_colegios_id_fk" FOREIGN KEY ("colegio_cliente_id") REFERENCES "public"."colegios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_colegio_destino_id_colegios_id_fk" FOREIGN KEY ("colegio_destino_id") REFERENCES "public"."colegios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pasos_alumno" ADD CONSTRAINT "pasos_alumno_asignacion_id_asignaciones_id_fk" FOREIGN KEY ("asignacion_id") REFERENCES "public"."asignaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_leaders_viaje" ADD CONSTRAINT "group_leaders_viaje_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pasos_viaje" ADD CONSTRAINT "pasos_viaje_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE cascade ON UPDATE no action;