CREATE TYPE "public"."canal_alta" AS ENUM('webhook', 'alta_manual');--> statement-breakpoint
ALTER TABLE "alumnos" ADD COLUMN "canal_alta" "canal_alta" DEFAULT 'alta_manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "alumnos" ADD COLUMN "familia_user_id" uuid;--> statement-breakpoint
ALTER TABLE "alumnos" ADD COLUMN "acceso_familia_enviado_at" timestamp;