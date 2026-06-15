CREATE TYPE "public"."consulta_cuando" AS ENUM('proximos_3_meses', 'este_ano', 'proximo_ano', 'solo_averiguando');--> statement-breakpoint
CREATE TYPE "public"."consulta_destino" AS ENUM('reino_unido', 'irlanda', 'malta', 'canada', 'estados_unidos', 'australia', 'nueva_zelanda', 'sudafrica', 'no_se');--> statement-breakpoint
CREATE TYPE "public"."consulta_estado" AS ENUM('nueva', 'contactada', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."consulta_modalidad" AS ENUM('asesoramiento', 'grupal', 'individual', 'study_work');--> statement-breakpoint
CREATE TYPE "public"."consulta_para_quien" AS ENUM('para_mi', 'para_mi_hijo', 'colegio');--> statement-breakpoint
CREATE TYPE "public"."suscriptor_estado" AS ENUM('activo', 'baja');--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text NOT NULL,
	"telefono" text NOT NULL,
	"para_quien" "consulta_para_quien" NOT NULL,
	"institucion" text,
	"modalidad" "consulta_modalidad" NOT NULL,
	"destino" "consulta_destino",
	"cuando" "consulta_cuando" NOT NULL,
	"mensaje" text,
	"estado" "consulta_estado" DEFAULT 'nueva' NOT NULL,
	"creado_el" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suscriptores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"estado" "suscriptor_estado" DEFAULT 'activo' NOT NULL,
	"origen" text DEFAULT 'hero' NOT NULL,
	"creado_el" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suscriptores_email_unique" UNIQUE("email")
);
