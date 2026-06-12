CREATE TYPE "public"."moneda_cuota" AS ENUM('USD', 'GBP', 'ARS');--> statement-breakpoint
CREATE TYPE "public"."viaje_tipo" AS ENUM('grupal', 'individual');--> statement-breakpoint
ALTER TYPE "public"."viaje_origen" ADD VALUE 'juk_directo';--> statement-breakpoint
ALTER TABLE "cuotas" ALTER COLUMN "moneda" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cuotas" ALTER COLUMN "moneda" SET DATA TYPE "public"."moneda_cuota" USING "moneda"::"public"."moneda_cuota";--> statement-breakpoint
ALTER TABLE "cuotas" ALTER COLUMN "moneda" SET DEFAULT 'USD'::"public"."moneda_cuota";--> statement-breakpoint
ALTER TABLE "cuotas" ADD COLUMN "cotizacion_aplicada" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "viajes" ADD COLUMN "tipo" "viaje_tipo" DEFAULT 'grupal' NOT NULL;--> statement-breakpoint
ALTER TABLE "viajes" ADD COLUMN "comision_agencia_pct" integer;--> statement-breakpoint
ALTER TABLE "viajes" ADD COLUMN "fee_representante" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "viajes" ADD COLUMN "fee_representante_es_porcentaje" boolean DEFAULT false NOT NULL;
