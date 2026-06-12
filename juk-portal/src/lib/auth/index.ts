import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

/**
 * Better-Auth configuration.
 *
 * Decisions specific to JUK:
 *  - email + password only (no OAuth yet — small known team)
 *  - sessions expire at 8h of inactivity (PRD §1.3)
 *  - password reset link expires at 24h (PRD §1.2 US-04)
 *  - admin creates users from /usuarios; new users get a temp password emailed
 *  - email verification required before first login (set on admin invite)
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
  user: {
    additionalFields: {
      role: { type: "string", required: true, input: false, defaultValue: "admin_juk" },
      isActive: { type: "boolean", required: true, input: false, defaultValue: true },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,

    // Send reset link via Resend (implemented in lib/email/send-reset-link.tsx)
    sendResetPassword: async ({ user, url }) => {
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
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,                // 5 min in-memory cache
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
    customRules: {
      "/sign-in/email": { window: 60 * 15, max: 5 },
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
