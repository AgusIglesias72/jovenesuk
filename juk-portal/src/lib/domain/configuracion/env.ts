/**
 * Catálogo de variables de entorno: qué habilita cada una, qué pasa si falta y
 * cómo se ve un valor de ejemplo.
 *
 * Es la fuente de verdad que comparten `npm run check:env`
 * (`scripts/check-env.ts`) y la tarjeta "Estado de servicios" de
 * `/configuracion`: la terminal y la pantalla dicen lo mismo porque leen esta
 * lista. `.env.example` se verifica contra ella (el script avisa si divergen).
 *
 * El detalle operativo de cada servicio está en
 * `../../../../.claude/docs/04-operacion-y-handoff.md`; el paso a paso para
 * darlos de alta, en `docs/setup-servicios.md`.
 */

export const SERVICIOS_ENV = [
  "app",
  "neon",
  "auth",
  "resend",
  "r2",
  "trigger",
  "sentry",
  "webhooks",
  "analytics",
  "tests",
] as const;

export type ServicioEnv = (typeof SERVICIOS_ENV)[number];

/** Los cinco primeros conservan el nombre que ya mostraba `/configuracion`. */
export const SERVICIO_LABELS: Record<ServicioEnv, string> = {
  app: "App (URLs públicas)",
  neon: "Base de datos (Neon)",
  resend: "Resend (emails)",
  r2: "Cloudflare R2 (archivos)",
  webhooks: "Webhook Google Form",
  trigger: "Trigger.dev (jobs)",
  auth: "Better-Auth (login)",
  sentry: "Sentry (errores)",
  analytics: "Analytics y SEO",
  tests: "Seeds y tests",
};

/**
 * - `requerida`: sin ella la app no arranca o no se puede usar, en ningún entorno.
 * - `produccion`: en local hay un fallback razonable (dry-run de mails, disco
 *   para documentos); en un deploy su ausencia rompe una capacidad.
 * - `opcional`: suma algo; su ausencia no rompe nada.
 */
export type NivelEnv = "requerida" | "produccion" | "opcional";

export type VariableEnv = {
  nombre: string;
  servicio: ServicioEnv;
  nivel: NivelEnv;
  /** Para qué sirve, en una línea. */
  habilita: string;
  /** Qué pasa si falta o si quedó con el valor de ejemplo. */
  siFalta: string;
  /** Valor de la plantilla. Sirve de ejemplo y para detectar placeholders. */
  ejemplo: string;
  /** Si va en `.env.example`. Las de tests se documentan en 05-testing. */
  enPlantilla?: boolean;
  /** Aflojaría una protección si quedara seteada en un deploy de producción. */
  prohibidaEnProduccion?: boolean;
};

export const VARIABLES_ENV: readonly VariableEnv[] = [
  {
    nombre: "NEXT_PUBLIC_APP_URL",
    servicio: "app",
    nivel: "requerida",
    habilita: "Base de las URLs que se arman del lado del server (links de los mails, cliente de auth).",
    siFalta: "Los mails salen con links relativos que no abren.",
    ejemplo: "http://localhost:3000",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_SITE_URL",
    servicio: "app",
    nivel: "produccion",
    habilita: "Canonicals, sitemap, imágenes OG y JSON-LD del sitio público. Sin barra final.",
    siFalta: "El SEO del sitio público apunta a localhost.",
    ejemplo: "http://localhost:3000",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_PORTAL_URL",
    servicio: "app",
    nivel: "opcional",
    habilita: "Separación de dominios: gestión en portal.*, marketing en la raíz.",
    siFalta: "Todo se sirve desde el mismo dominio (está bien).",
    ejemplo: "https://portal.jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "DATABASE_URL",
    servicio: "neon",
    nivel: "requerida",
    habilita: "La conexión pooled que usa la app.",
    siFalta: "La app no arranca ni compila: `src/lib/db/index.ts` tira al importarse.",
    ejemplo:
      "postgres://user:password@ep-xxx-pooler.sa-east-1.aws.neon.tech/juk?sslmode=require",
    enPlantilla: true,
  },
  {
    nombre: "DATABASE_URL_UNPOOLED",
    servicio: "neon",
    nivel: "opcional",
    habilita: "Conexión directa para las migraciones (solo drizzle-kit).",
    siFalta: "drizzle-kit usa DATABASE_URL; la app nunca la lee.",
    ejemplo: "postgres://user:password@ep-xxx.sa-east-1.aws.neon.tech/juk?sslmode=require",
    enPlantilla: true,
  },
  {
    nombre: "BETTER_AUTH_SECRET",
    servicio: "auth",
    nivel: "requerida",
    habilita: "Firma de las sesiones. Se genera con `openssl rand -base64 32`.",
    siFalta: "No hay login.",
    ejemplo: "<generate-32-byte-random-secret>",
    enPlantilla: true,
  },
  {
    nombre: "BETTER_AUTH_URL",
    servicio: "auth",
    nivel: "requerida",
    habilita: "Origen confiable de las cookies de sesión.",
    siFalta: "El login falla o la cookie no se fija en el dominio correcto.",
    ejemplo: "http://localhost:3000",
    enPlantilla: true,
  },
  {
    nombre: "GOOGLE_CLIENT_ID",
    servicio: "auth",
    nivel: "opcional",
    habilita:
      'Botón "Continuar con Google" en el login. Solo entra a una cuenta que ya existe: nunca crea una.',
    siFalta: "El botón no se muestra y el login queda solo con email y contraseña (está bien).",
    ejemplo: "xxxxxxxxxxxx.apps.googleusercontent.com",
    enPlantilla: true,
  },
  {
    nombre: "GOOGLE_CLIENT_SECRET",
    servicio: "auth",
    nivel: "opcional",
    habilita: "Secreto del cliente OAuth; va junto al ID o Google no queda habilitado.",
    siFalta: "Ídem GOOGLE_CLIENT_ID: las dos van juntas o el provider no se declara.",
    ejemplo: "GOCSPX-xxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "RESEND_API_KEY",
    servicio: "resend",
    nivel: "produccion",
    habilita: "El envío real de mails.",
    siFalta:
      "Fuera de producción los mails se renderizan y loguean sin salir (dry-run implícito). En producción el envío falla.",
    ejemplo: "re_xxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    // Los remitentes son opcionales a propósito: /configuracion los guarda en
    // la base y tiene prioridad sobre el env (MIN-09). El env es solo el default.
    nombre: "EMAIL_FROM_ADDRESS",
    servicio: "resend",
    nivel: "opcional",
    habilita: "Remitente por defecto de los mails automáticos.",
    siFalta: "Se usa el default del dominio; `/configuracion` tiene prioridad sobre el env.",
    ejemplo: "info@jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "EMAIL_FROM_NAME",
    servicio: "resend",
    nivel: "opcional",
    habilita: "Nombre visible del remitente.",
    siFalta: "Se usa el default del dominio.",
    ejemplo: "Jóvenes en UK",
    enPlantilla: true,
  },
  {
    nombre: "EMAIL_REPLY_TO",
    servicio: "resend",
    nivel: "opcional",
    habilita: "Casilla a la que contesta quien recibe el mail.",
    siFalta: "Las respuestas van al remitente, que puede ser noreply@.",
    ejemplo: "info@jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "EMAIL_FROM_COMUNICACIONES",
    servicio: "resend",
    nivel: "opcional",
    habilita: "Remitente de lo que espera respuesta (credenciales, cancelaciones).",
    siFalta: "Todo sale desde el remitente automático.",
    ejemplo: "comunicaciones@jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "EMAIL_FROM_OUTREACH",
    servicio: "resend",
    nivel: "opcional",
    habilita: "Remitente del outreach del CRM, en el subdominio de marketing.",
    siFalta: "El outreach saldría por el dominio transaccional y le gastaría reputación.",
    ejemplo: "hola@mkt.jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "LEADS_NOTIFY_TO",
    servicio: "resend",
    nivel: "produccion",
    habilita: "Casilla interna que recibe el aviso de una consulta nueva.",
    siFalta: "El equipo no se entera de un lead salvo que entre al portal.",
    ejemplo: "leads@jovenesenuk.com",
    enPlantilla: true,
  },
  {
    nombre: "R2_ACCOUNT_ID",
    servicio: "r2",
    nivel: "produccion",
    habilita: "Cuenta de Cloudflare del bucket de documentos.",
    siFalta:
      "En local los documentos van a `.uploads/`. En cualquier deploy de Vercel la subida falla a propósito (StorageNoConfiguradoError).",
    ejemplo: "xxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "R2_ACCESS_KEY_ID",
    servicio: "r2",
    nivel: "produccion",
    habilita: "Credencial del token de R2.",
    siFalta: "Ídem R2_ACCOUNT_ID: las cuatro van juntas o no hay storage.",
    ejemplo: "xxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "R2_SECRET_ACCESS_KEY",
    servicio: "r2",
    nivel: "produccion",
    habilita: "Secreto del token de R2.",
    siFalta: "Ídem R2_ACCOUNT_ID.",
    ejemplo: "xxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "R2_BUCKET_NAME",
    servicio: "r2",
    nivel: "produccion",
    habilita: "Bucket **privado** donde viven pasaportes y consentimientos.",
    siFalta: "Ídem R2_ACCOUNT_ID. Nunca se configura un dominio público ni r2.dev.",
    ejemplo: "juk-documents",
    enPlantilla: true,
  },
  {
    nombre: "TRIGGER_SECRET_KEY",
    servicio: "trigger",
    nivel: "produccion",
    habilita: "Encolar los jobs (recordatorios, transiciones por fecha, avisos).",
    siFalta:
      "No hay recordatorios automáticos, A1 no pasa solo a vencido y los viajes no cambian de estado por fecha.",
    ejemplo: "tr_dev_xxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "TRIGGER_PROJECT_ID",
    servicio: "trigger",
    nivel: "produccion",
    habilita: "Proyecto de Trigger.dev al que se deployan las tasks.",
    siFalta: "`trigger.config.ts` cae a un placeholder y el deploy no sabe a dónde ir.",
    ejemplo: "proj_xxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_SENTRY_DSN",
    servicio: "sentry",
    nivel: "produccion",
    habilita: "Reporte de errores y el report-uri de la CSP.",
    siFalta: "Sentry queda desactivado: los errores de producción no se ven y la CSP no reporta.",
    ejemplo: "https://xxxxx@oXXXXX.ingest.us.sentry.io/xxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "SENTRY_AUTH_TOKEN",
    servicio: "sentry",
    nivel: "opcional",
    habilita: "Subir source maps en el build (con SENTRY_ORG y SENTRY_PROJECT).",
    siFalta: "El build no toca Sentry; los stack traces llegan minificados.",
    ejemplo: "sntrys_xxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "SENTRY_ORG",
    servicio: "sentry",
    nivel: "opcional",
    habilita: "Organización de Sentry para los source maps.",
    siFalta: "Ídem SENTRY_AUTH_TOKEN: las tres van juntas.",
    ejemplo: "juk",
    enPlantilla: true,
  },
  {
    nombre: "SENTRY_PROJECT",
    servicio: "sentry",
    nivel: "opcional",
    habilita: "Proyecto de Sentry para los source maps.",
    siFalta: "Ídem SENTRY_AUTH_TOKEN.",
    ejemplo: "portal",
    enPlantilla: true,
  },
  {
    nombre: "GOOGLE_FORM_WEBHOOK_SECRET",
    servicio: "webhooks",
    nivel: "produccion",
    habilita: "Autenticar el webhook del Google Form (32+ caracteres).",
    siFalta: "El webhook rechaza todo con 401 y los casos del form no entran.",
    ejemplo: "<generate-random-secret>",
    enPlantilla: true,
  },
  {
    nombre: "RESEND_WEBHOOK_SECRET",
    servicio: "webhooks",
    nivel: "opcional",
    habilita: "Verificar la firma de los eventos de Resend (entregas, aperturas, bounces).",
    siFalta: "Los eventos de tracking se ignoran (el endpoint responde 200 igual).",
    ejemplo: "whsec_xxxx",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_GA_ID",
    servicio: "analytics",
    nivel: "opcional",
    habilita: "Google Analytics 4 en el sitio público.",
    siFalta: "No se carga analytics (tampoco su cookie).",
    ejemplo: "G-XXXXXXXXXX",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_GSC_VERIFICATION",
    servicio: "analytics",
    nivel: "opcional",
    habilita: "Meta tag de verificación de Search Console.",
    siFalta: "Hay que verificar el dominio por DNS.",
    ejemplo: "xxxxxxxxxxxxxxxxxxxxxxxx",
    enPlantilla: true,
  },
  {
    nombre: "NEXT_PUBLIC_ENABLE_TWEAK",
    servicio: "analytics",
    nivel: "opcional",
    habilita: "Muestra el DesignTweaker en un build que no es dev (staging).",
    siFalta: "En dev se muestra igual; en un build de producción queda oculto, que es lo correcto.",
    ejemplo: "1",
    enPlantilla: true,
    prohibidaEnProduccion: true,
  },
  {
    nombre: "EMAIL_DRY_RUN",
    servicio: "tests",
    nivel: "opcional",
    habilita: "Renderiza los mails y los loguea sin enviarlos. Lo fijan Playwright y el CI.",
    siFalta:
      "Con una RESEND_API_KEY presente (aunque sea un placeholder) el dry-run se apaga y los envíos fallan.",
    ejemplo: "1",
    enPlantilla: true,
    prohibidaEnProduccion: true,
  },
  {
    nombre: "SEED_TEST_PASSWORD",
    servicio: "tests",
    nivel: "opcional",
    habilita: "Contraseña de las cuentas `test.*` que crea `db:seed:demo` y usan los E2E.",
    siFalta: "No se puede correr `db:seed:demo` ni Playwright.",
    ejemplo: "<elegí-una-password-de-prueba>",
    enPlantilla: true,
  },
  {
    nombre: "NEON_PROJECT_ID",
    servicio: "tests",
    nivel: "opcional",
    habilita: "`npm run ci:local`: el proyecto donde se crean las branches efímeras (hijas de `ci-base`).",
    siFalta: "`ci:local` corre solo los chequeos rápidos; la integración y Playwright piden el id.",
    ejemplo: "<id-del-proyecto-neon>",
    enPlantilla: true,
  },
  {
    nombre: "SEED_FAMILIA_PASSWORD",
    servicio: "tests",
    nivel: "opcional",
    habilita: "Contraseña de las familias demo (si se quiere distinta de SEED_TEST_PASSWORD).",
    siFalta: "Las familias demo usan SEED_TEST_PASSWORD.",
    ejemplo: "<opcional>",
  },
];

const PATRONES_PLACEHOLDER = [
  /^<.*>$/, // <generate-32-byte-random-secret>
  /x{6,}/i, // re_xxxxxxxxxxxx, G-XXXXXXXXXX
  /user:password@/, // la DATABASE_URL de la plantilla
];

/**
 * Un valor que quedó con el molde de `.env.example`. Es peor que la ausencia:
 * una `RESEND_API_KEY` placeholder apaga el dry-run y hace fallar los envíos, y
 * unas credenciales R2 placeholder gastan un round-trip fallido por subida.
 *
 * Solo mira la forma del valor, nunca si coincide con `ejemplo`: varios
 * ejemplos del catálogo son valores usables de verdad (`SENTRY_ORG=juk`,
 * `R2_BUCKET_NAME=juk-documents`) y marcarlos daría un falso positivo.
 */
export function esPlaceholder(valor: string): boolean {
  const v = valor.trim().replace(/^["']|["']$/g, "");
  if (!v) return false;
  return PATRONES_PLACEHOLDER.some((p) => p.test(v));
}

export type EstadoEnv = "ok" | "placeholder" | "falta";
export type SeveridadEnv = "error" | "aviso" | "info";

export type Evaluacion = VariableEnv & {
  estado: EstadoEnv;
  severidad: SeveridadEnv;
  /** Seteada donde no debería (EMAIL_DRY_RUN en un deploy de producción). */
  prohibida: boolean;
};

export type PerfilEnv = "local" | "produccion";

function severidadDe(
  variable: VariableEnv,
  estado: EstadoEnv,
  perfil: PerfilEnv
): SeveridadEnv {
  if (estado === "ok") return "info";
  const enProduccion = perfil === "produccion";
  if (variable.nivel === "requerida") return "error";
  if (variable.nivel === "produccion") return enProduccion ? "error" : "aviso";
  return estado === "placeholder" ? "aviso" : "info";
}

export function evaluarVariable(
  variable: VariableEnv,
  valor: string | undefined,
  perfil: PerfilEnv
): Evaluacion {
  const limpio = (valor ?? "").trim().replace(/^["']|["']$/g, "");
  const estado: EstadoEnv = !limpio ? "falta" : esPlaceholder(limpio) ? "placeholder" : "ok";
  const prohibida =
    perfil === "produccion" && estado !== "falta" && variable.prohibidaEnProduccion === true;

  return {
    ...variable,
    estado,
    prohibida,
    severidad: prohibida ? "error" : severidadDe(variable, estado, perfil),
  };
}

export type ResumenEnv = {
  perfil: PerfilEnv;
  variables: Evaluacion[];
  errores: number;
  avisos: number;
  /** Sin errores: el entorno alcanza para el perfil pedido. */
  ok: boolean;
};

export function evaluarEntorno(
  env: Record<string, string | undefined>,
  perfil: PerfilEnv
): ResumenEnv {
  const variables = VARIABLES_ENV.map((v) => evaluarVariable(v, env[v.nombre], perfil));
  const errores = variables.filter((v) => v.severidad === "error").length;
  const avisos = variables.filter((v) => v.severidad === "aviso").length;
  return { perfil, variables, errores, avisos, ok: errores === 0 };
}

export type EstadoServicio = {
  servicio: ServicioEnv;
  nombre: string;
  estado: EstadoEnv;
  detalle: string;
};

/**
 * Una línea por servicio para la tarjeta de `/configuracion`: el peor estado de
 * sus variables manda, y el detalle nombra las que hay que tocar.
 */
export function resumenPorServicio(resumen: ResumenEnv): EstadoServicio[] {
  return SERVICIOS_ENV.map((servicio) => {
    const suyas = resumen.variables.filter((v) => v.servicio === servicio && !v.prohibidaEnProduccion);
    const faltan = suyas.filter((v) => v.estado === "falta" && v.nivel !== "opcional");
    const placeholders = suyas.filter((v) => v.estado === "placeholder");

    const estado: EstadoEnv =
      placeholders.length > 0 ? "placeholder" : faltan.length > 0 ? "falta" : "ok";
    const detalle =
      placeholders.length > 0
        ? `valor de ejemplo sin reemplazar: ${placeholders.map((v) => v.nombre).join(", ")}`
        : faltan.length > 0
          ? `falta ${faltan.map((v) => v.nombre).join(", ")}`
          : "configurado";

    return { servicio, nombre: SERVICIO_LABELS[servicio], estado, detalle };
  });
}
