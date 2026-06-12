ALTER TABLE "group_leaders_viaje" ALTER COLUMN "es_principal" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "group_leaders_viaje" ALTER COLUMN "es_principal" SET DATA TYPE boolean USING ("es_principal" = 'si');--> statement-breakpoint
ALTER TABLE "group_leaders_viaje" ALTER COLUMN "es_principal" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "group_leaders_viaje" ALTER COLUMN "es_principal" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "colegios" ADD COLUMN "requiere_test_nivel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group_leaders_viaje" ADD CONSTRAINT "group_leaders_viaje_group_leader_id_group_leaders_id_fk" FOREIGN KEY ("group_leader_id") REFERENCES "public"."group_leaders"("id") ON DELETE cascade ON UPDATE no action;