import { pgTable, text, timestamp, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";

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
  image: text("image"),
  role: userRole("role").notNull().default("admin_juk"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
