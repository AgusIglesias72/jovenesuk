/**
 * Database seed script.
 *
 * Creates the initial super_admin user so you can log into the portal
 * for the first time. Idempotent — if the user already exists, prints
 * a message and exits cleanly without creating a duplicate.
 *
 * Usage:
 *   npm run db:seed
 *
 * Output: prints email + temporary password to the console.
 * IMPORTANT: change the email below to YOUR real email before running.
 */

import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

// ============================================================
// CONFIGURACIÓN — editar antes de correr
// ============================================================

const SEED_EMAIL = "agustin@jovenesenuk.com";
const SEED_NAME = "Agustín";

// Los 4 admins reales del equipo JUK. Comentar los que no querés crear
// todavía (ej: vas a crearlos vos manualmente desde /usuarios después
// de tu primer login).
const TEAM_MEMBERS: Array<{
  email: string;
  name: string;
  role: "super_admin" | "admin_juk";
}> = [
  // { email: "maria@jovenesenuk.com",    name: "María",    role: "super_admin" as const },
  // { email: "felix@jovenesenuk.com",    name: "Felix",    role: "admin_juk" as const },
  // { email: "delfina@jovenesenuk.com",  name: "Delfina",  role: "admin_juk" as const },
  // { email: "tomas@jovenesenuk.com",    name: "Tomas",    role: "admin_juk" as const },
];

// ============================================================

function generateTempPassword(): string {
  // 12 chars base64url: legible, copiable, suficientemente fuerte para temp
  return randomBytes(9).toString("base64url");
}

async function userExists(email: string): Promise<boolean> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return existing.length > 0;
}

async function createUser(opts: {
  email: string;
  name: string;
  role: "super_admin" | "admin_juk";
}) {
  const tempPassword = generateTempPassword();

  // Usamos Better-Auth para crear el usuario con su credencial
  // (esto se encarga del hashing del password correctamente).
  const result = await auth.api.signUpEmail({
    body: {
      email: opts.email,
      password: tempPassword,
      name: opts.name,
    },
  });

  if (!result || "error" in result) {
    throw new Error(
      `Better-Auth signup failed for ${opts.email}: ${JSON.stringify(result)}`
    );
  }

  // Actualizar el rol (Better-Auth crea con role default = "admin_juk")
  if (opts.role === "super_admin") {
    await db
      .update(users)
      .set({ role: "super_admin", emailVerified: true })
      .where(eq(users.email, opts.email));
  } else {
    // Marcar email como verificado para que pueda loguearse directamente
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, opts.email));
  }

  return { email: opts.email, password: tempPassword };
}

async function main() {
  console.log("🌱 JUK Portal · Seed script\n");

  const allUsers = [
    { email: SEED_EMAIL, name: SEED_NAME, role: "super_admin" as const },
    ...TEAM_MEMBERS,
  ];

  const created: Array<{ email: string; password: string; role: string }> = [];
  const skipped: string[] = [];

  for (const user of allUsers) {
    if (await userExists(user.email)) {
      console.log(`⏭️  ${user.email} ya existe, salteando.`);
      skipped.push(user.email);
      continue;
    }

    try {
      const result = await createUser(user);
      created.push({ ...result, role: user.role });
      console.log(`✅ Creado: ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`❌ Error creando ${user.email}:`, err);
    }
  }

  if (created.length === 0) {
    console.log("\nNo se crearon usuarios nuevos.");
    if (skipped.length > 0) {
      console.log(`(Ya existían: ${skipped.join(", ")})`);
    }
    process.exit(0);
  }

  console.log("\n" + "=".repeat(60));
  console.log("CREDENCIALES TEMPORALES — Guardalas ANTES de cerrar la terminal");
  console.log("=".repeat(60));

  for (const u of created) {
    console.log(`
  Email:      ${u.email}
  Password:   ${u.password}
  Rol:        ${u.role}
`);
  }

  console.log("=".repeat(60));
  console.log("Loguéate en /login con estas credenciales.");
  console.log("Cambiá la password en cuanto entres por primera vez.");
  console.log("=".repeat(60) + "\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
