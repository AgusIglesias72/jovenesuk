CREATE TABLE "notificaciones_enviadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"entidad_tipo" text NOT NULL,
	"entidad_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"canal" text DEFAULT 'email' NOT NULL,
	"destinatario" text NOT NULL,
	"resend_message_id" text,
	"estado" text DEFAULT 'sent' NOT NULL,
	"enviado_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_notificacion_ocurrencia" UNIQUE("tipo","entidad_id","clave")
);
