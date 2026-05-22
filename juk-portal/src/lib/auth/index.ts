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
    window: 60,                      // 60s window
    max: 5,                          // 5 attempts (PRD §1.2 US-01)
  },

  advanced: {
    cookiePrefix: "juk",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type Auth = typeof auth;
