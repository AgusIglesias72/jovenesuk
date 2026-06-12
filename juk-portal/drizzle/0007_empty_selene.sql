CREATE TYPE "public"."paso_codigo" AS ENUM('paso_0', 'a1', 'a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'c3', 'd1', 'd2');--> statement-breakpoint
ALTER TYPE "public"."paso_estado" ADD VALUE 'vencido';--> statement-breakpoint
ALTER TABLE "pasos_alumno" DROP CONSTRAINT "uniq_asignacion_paso_tipo";--> statement-breakpoint
ALTER TABLE "pasos_alumno" ADD COLUMN "codigo" "paso_codigo" NOT NULL;--> statement-breakpoint
ALTER TABLE "pasos_alumno" ADD CONSTRAINT "uniq_asignacion_paso_codigo" UNIQUE("asignacion_id","codigo");