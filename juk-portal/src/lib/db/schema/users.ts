import { pgTable, text, timestamp, boolean, pgEnum, uuid, integer, bigint } from "drizzle-orm/pg-core";

/**
 * Roles del sistema.
 * El PRD v1.1 cubre sólo admin_juk; representante y familia están definidos
 * acá para soportar futuras vistas (portal del representante, portal de familias)
 * sin migrar el schema.
 */
export const userRole = pgEnum("user_role", [
  "admin_juk",
  "super_admin",
  "representante",
  "familia",
]);

/**
 * Tabla principal de usuarios.
 *
 * Better-Auth maneja el ciclo de vida (creación, hashing de password, sesiones)
 * pero el rol y los datos JUK-específicos son nuestros.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name").notNull(),
  apellido: text("apellido"),
  image: text("image"),
  role: userRole("role").notNull().default("admin_juk"),
  // Área del admin dentro del equipo (CEO/Sales/Marketing/Operations). Libre
  // a propósito: el PRD lo llama sub_rol_admin pero no fija valores.
  subRolAdmin: text("sub_rol_admin"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Rate limiting de Better-Auth con storage en DB (US-01: 5 intentos fallidos
 * → bloqueo 15 min). En memoria no sirve: cada lambda de Vercel resetearía
 * el contador.
 */
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/**
 * Sesiones de Better-Auth.
 * Sesiones expiran a las 8hs (PRD M1).
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").unique().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Credenciales (email/password).
 * Better-Auth admite múltiples providers; por ahora sólo email+password.
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  password: text("password"),
  // Columnas OAuth del core schema de Better-Auth (>= 1.7 las exige aunque
  // no haya providers sociales). Quedan siempre null con email+password.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Tokens de reset de password y verificación de email.
 * Caducan a las 24hs (PRD M1).
 */
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
