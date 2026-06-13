CREATE TABLE "configuracion" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" json NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
