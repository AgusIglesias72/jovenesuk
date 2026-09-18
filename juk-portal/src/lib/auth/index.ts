import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { googleOAuthConfig } from "./google-oauth";
import { debeBloquearAlta, SIGN_UP_PATHS } from "./sign-up-policy";

/**
 * Better-Auth configuration.
 *
 * Decisions specific to JUK:
 *  - email + contraseña, más Google SOLO para entrar a una cuenta que YA existe:
 *    nunca un alta (`disableSignUp: true`, más abajo). Sin GOOGLE_CLIENT_ID y
 *    GOOGLE_CLIENT_SECRET el provider ni se declara y el login queda solo con
 *    email y contraseña, que es el estado normal en local y en los E2E
 *  - sessions expire at 8h of inactivity (PRD §1.3)
 *  - password reset link expires at 24h (PRD §1.2 US-04)
 *  - el equipo crea las cuentas (/usuarios y el acceso de familias) y la persona
 *    recibe un link para crear su contraseña: nunca una contraseña temporal
 *  - requireEmailVerification: el alta server-side marca emailVerified, así el
 *    link alcanza para entrar
 *  - una cuenta desactivada no abre sesión (databaseHooks, más abajo)
 *  - no hay registro público: el sign-up solo se atiende server-side
 */
const google = googleOAuthConfig();

/*
 * Google entra a una cuenta que ya existe; nunca crea una.
 *
 * `disableSignUp: true` es LA línea de seguridad: sin ella, cualquiera con un
 * Gmail entraría al portal como `familia` (el defaultValue de `role`).
 * Better-Auth lo corta en link-account ANTES de escribir nada en `users` ni en
 * `accounts`, y el callback lo traduce a `/login?error=signup_disabled`.
 *
 * Sin las dos credenciales queda `undefined`: el provider no se declara,
 * `/api/auth/sign-in/social` responde 404 y el botón no se muestra. Nada de
 * `hd` (las familias usan Gmail personal, no Workspace).
 */
const socialProviders = google
  ? {
      google: {
        clientId: google.clientId,
        clientSecret: google.clientSecret,
        disableSignUp: true,
        prompt: "select_account" as const,
      },
    }
  : undefined;

export const auth = betterAuth({
  // En dev el server puede correr en 3000 (el del usuario) o 3001 (E2E/Claude);
  // sin esto, el origin que no coincide con BETTER_AUTH_URL devuelve 403.
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:3001"],

  database: drizzleAdapter(db, {
    provider: "pg",
    // Nuestras tablas son plurales (users, sessions, accounts, verifications);
    // Better-Auth por defecto busca user/session/account/verification.
    usePlural: true,
  }),

  // Campos JUK que viven en la tabla users pero no son nativos de Better-Auth.
  // Declararlos acá los incluye en el tipo de session.user (input:false = no settable en signup).
  // El default es el rol de MENOR privilegio: quien crea admins (seed.ts,
  // usuarios/actions.ts) setea el rol explícito después del alta.
  user: {
    additionalFields: {
      role: { type: "string", required: true, input: false, defaultValue: "familia" },
      isActive: { type: "boolean", required: true, input: false, defaultValue: true },
    },
  },

  socialProviders,

  /*
   * La vinculación se apoya en el email verificado de las dos puntas: el
   * `email_verified` del id_token de Google y el `emailVerified` de la fila
   * local (todas las cuentas JUK nacen con `emailVerified: true` desde el
   * server). NO agregar google a `accountLinking.trustedProviders`: un provider
   * "confiable" saltea el chequeo del `email_verified` del id_token, que es
   * justo el vector de toma de cuenta.
   *
   * `updateUserInfoOnLink: false` (el default, explícito acá) evita que el
   * perfil de Google pise nombre e imagen de la fila que administra el equipo.
   * Los tokens se guardan cifrados: no los usamos para nada, en texto plano
   * serían pasivo puro.
   */
  account: {
    accountLinking: {
      enabled: true,
      updateUserInfoOnLink: false,
    },
    encryptOAuthTokens: true,
  },

  // Capa 1 del cierre de registro: el router HTTP responde 404 antes de tocar
  // el endpoint. `auth.api.signUpEmail` no pasa por acá (no es un request).
  disabledPaths: [...SIGN_UP_PATHS],

  // Capa 2: cualquier otro path de sign-up que llegue por HTTP (variación de
  // ruta, plugin futuro) también muere acá, sin depender del proxy.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (debeBloquearAlta(ctx.path, ctx.request !== undefined)) {
        throw new APIError("NOT_FOUND", { message: "Registro deshabilitado" });
      }
    }),
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // US-04: el mail y reset-form.tsx prometen 24h; el default de la librería
    // es 1h. Explícito para que no dependa de la versión instalada.
    resetPasswordTokenExpiresIn: 60 * 60 * 24,

    /*
     * Un mismo link de Better-Auth cubre dos situaciones distintas, y el copy
     * tiene que decir la verdad en cada una: el alta de una cuenta (el usuario
     * todavía no tiene contraseña) va con el mail de bienvenida, y el olvido
     * de contraseña con el de reset. Las distingue el `alta=` que el llamador
     * mete en el redirectTo.
     */
    sendResetPassword: async ({ user, url }) => {
      const callback = decodeURIComponent(
        new URL(url).searchParams.get("callbackURL") ?? ""
      );
      const esAlta = callback.includes("alta=");

      if (esAlta) {
        const { sendWelcomeEmail } = await import("@/lib/email/send-welcome");
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          audiencia: callback.includes("alta=familia") ? "familia" : "equipo",
          crearPasswordUrl: url,
        });
        return;
      }

      const { sendResetPasswordEmail } = await import("@/lib/email/send-reset-link");
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
    },

    // US-04: aviso por email cuando la contraseña se cambió con éxito.
    onPasswordReset: async ({ user }) => {
      const { sendPasswordChangedEmail } = await import("@/lib/email/send-password-changed");
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
        changedAt: new Date(),
      });
    },
  },

  /*
   * Una cuenta desactivada no abre sesión. Va en el hook de creación de sesión
   * y no en un before sobre /sign-in/email porque Better-Auth lo corre DESPUÉS
   * de verificar la contraseña: así nadie puede sondear qué emails existen y
   * están dados de baja. Lanzar el APIError corta antes de setear la cookie y
   * le llega al login como 403 ("Cuenta desactivada"); devolver false daría un
   * 401 genérico de credenciales.
   *
   * El `code` no es decorativo: el callback de OAuth solo convierte un APIError
   * en un redirect a /login si el body lo trae. Sin él, una cuenta desactivada
   * que entra por Google vería la respuesta cruda de la API en
   * /api/auth/callback/google. El status sigue siendo 403, así que el login por
   * email (que discrimina por status) no cambia de comportamiento.
   */
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const { getUsuarioById } = await import("@/lib/db/queries/usuarios");
          const usuario = await getUsuarioById(session.userId);
          if (usuario && usuario.isActive === false) {
            throw new APIError("FORBIDDEN", {
              code: "cuenta_desactivada",
              message: "Cuenta desactivada",
            });
          }
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8,         // 8 hours
    updateAge: 60 * 60,              // refresh session if accessed within 1h
    // Sin cookie cache: desactivar un usuario o cambiarle el rol tiene que
    // aplicar en el request siguiente, no hasta 5 min después. El costo es 1
    // query de sessions+users por request, deduplicada por `cache()` en
    // helpers.ts; el proxy solo mira la presencia del cookie, no lo afecta.
    cookieCache: {
      enabled: false,
    },
  },

  rateLimit: {
    enabled: true,                   // también en dev (default: solo prod)
    storage: "database",             // tabla rate_limits (memoria no sirve en serverless)
    modelName: "rateLimit",
    window: 60,
    max: 20,
    // US-01: 5 intentos de login en 15 min → bloqueado hasta que pase la ventana.
    // Aproximación al "5 fallidos consecutivos" del PRD: cuenta intentos, no
    // solo fallas (Better-Auth no expone hook de login fallido).
    // En dev el límite es más laxo: el equipo + los E2E comparten la IP local.
    customRules: {
      "/sign-in/email": {
        window: 60 * 15,
        max: process.env.NODE_ENV === "production" ? 5 : 30,
      },
      // Arrancar el flujo de Google no valida credenciales, pero sí escribe
      // estado y pega contra Google: mismo techo que el login por email.
      "/sign-in/social": {
        window: 60 * 15,
        max: process.env.NODE_ENV === "production" ? 10 : 30,
      },
    },
  },

  advanced: {
    cookiePrefix: "juk",
    useSecureCookies: process.env.NODE_ENV === "production",
    // Las PKs del schema son uuid con defaultRandom(); que la DB genere los IDs
    // en vez de Better-Auth (que produce strings no-uuid).
    database: {
      generateId: false,
    },
  },
});

export type Auth = typeof auth;
