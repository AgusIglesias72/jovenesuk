CREATE TYPE "public"."prospecto_comunicacion_estado" AS ENUM('pendiente', 'enviado', 'entregado', 'abierto', 'click', 'rebotado', 'spam', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."prospecto_comunicacion_tipo" AS ENUM('email', 'nota', 'llamada', 'reunion', 'cambio_estado', 'conversion');--> statement-breakpoint
CREATE TYPE "public"."prospecto_estado" AS ENUM('nuevo', 'contactado', 'interesado', 'propuesta', 'negociacion', 'ganado', 'perdido');--> statement-breakpoint
CREATE TABLE "prospecto_comunicaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospecto_id" uuid NOT NULL,
	"tipo" "prospecto_comunicacion_tipo" NOT NULL,
	"asunto" text,
	"cuerpo" text,
	"estado" "prospecto_comunicacion_estado",
	"destinatario" text,
	"resend_message_id" text,
	"meta" json,
	"creado_por" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"estado" "prospecto_estado" DEFAULT 'nuevo' NOT NULL,
	"posicion" integer DEFAULT 0 NOT NULL,
	"pais" "pais",
	"ciudad" text,
	"sitio_web" text,
	"ubicacion_url" text,
	"imagen_url" text,
	"imagen_key" text,
	"emails" json DEFAULT '[]'::json NOT NULL,
	"telefonos" json DEFAULT '[]'::json NOT NULL,
	"contacto_nombre" text,
	"contacto_cargo" text,
	"fuente" text,
	"notas" text,
	"responsable_id" uuid,
	"proxima_accion_at" timestamp,
	"motivo_perdida" text,
	"colegio_id" uuid,
	"suscrito_outreach" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_prospecto_unsubscribe_token" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "prospecto_comunicaciones" ADD CONSTRAINT "prospecto_comunicaciones_prospecto_id_prospectos_id_fk" FOREIGN KEY ("prospecto_id") REFERENCES "public"."prospectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectos" ADD CONSTRAINT "prospectos_colegio_id_colegios_id_fk" FOREIGN KEY ("colegio_id") REFERENCES "public"."colegios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_prospecto_com_prospecto_id" ON "prospecto_comunicaciones" USING btree ("prospecto_id");--> statement-breakpoint
CREATE INDEX "idx_prospecto_com_resend_message_id" ON "prospecto_comunicaciones" USING btree ("resend_message_id");