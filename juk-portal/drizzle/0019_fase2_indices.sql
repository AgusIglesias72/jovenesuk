CREATE UNIQUE INDEX "uniq_alumnos_dni" ON "alumnos" USING btree ("dni");--> statement-breakpoint
CREATE INDEX "idx_alumnos_familia_user" ON "alumnos" USING btree ("familia_user_id");--> statement-breakpoint
CREATE INDEX "idx_asignaciones_viaje" ON "asignaciones" USING btree ("viaje_id","estado");--> statement-breakpoint
CREATE INDEX "idx_cuotas_asignacion" ON "cuotas" USING btree ("asignacion_id");