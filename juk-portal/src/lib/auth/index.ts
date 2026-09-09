import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { debeBloquearAlta, SIGN_UP_PATHS } from "./sign-up-policy";

/**
 * Better-Auth configuration.
 *
 * Decisions specific to JUK:
 *  - email + password only (no OAuth yet — small known team)
 *  - sessions expire at 8h of inactivity (PRD §1.3)
 *  - password reset link expires at 24h (PRD §1.2 US-04)
 *  - admin creates users from /usuarios; new users get a temp password emailed
 *  - email verification required before first login (set on admin invite)
 *  - no hay registro público: el sign-up solo se atiende server-side
 */
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
