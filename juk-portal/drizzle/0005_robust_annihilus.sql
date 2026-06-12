CREATE TYPE "public"."documento_programa" AS ENUM('application_form', 'test_nivel', 'parental_consent', 'confirmation_letter', 'visa_immigration_letter');--> statement-breakpoint
CREATE TYPE "public"."requisito_documento" AS ENUM('requerido', 'opcional', 'na');--> statement-breakpoint
CREATE TYPE "public"."tipo_entrada" AS ENUM('eta', 'visa', 'ninguna');--> statement-breakpoint
CREATE TABLE "colegio_documento_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"colegio_id" uuid NOT NULL,
	"documento" "documento_programa" NOT NULL,
	"requisito" "requisito_documento" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "uniq_colegio_documento" UNIQUE("colegio_id","documento")
);
--> statement-breakpoint
ALTER TABLE "colegios" ADD COLUMN "tipo_entrada_requerida" "tipo_entrada" DEFAULT 'eta' NOT NULL;--> statement-breakpoint
ALTER TABLE "colegio_documento_config" ADD CONSTRAINT "colegio_documento_config_colegio_id_colegios_id_fk" FOREIGN KEY ("colegio_id") REFERENCES "public"."colegios"("id") ON DELETE cascade ON UPDATE no action;