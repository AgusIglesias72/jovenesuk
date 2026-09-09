import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { formRateLimits } from "@/lib/db/schema/leads";
import {
  decidirSobreEstado,
  type DecisionRateLimit,
  type VentanaRateLimit,
} from "@/lib/domain/anti-abuso";

import { unicaFila } from "./errors";

/**
 * Registra un intento y devuelve la decisión, todo en un solo statement: el
 * upsert incrementa si la ventana sigue vigente y la reinicia si venció, así
 * dos requests simultáneos no se pisan (leer-y-después-escribir sí lo haría).
 */
export async function incrementarYVerificar(
  key: string,
  limite: VentanaRateLimit,
  ahora: Date = new Date()
): Promise<DecisionRateLimit> {
  const corte = sql`${new Date(ahora.getTime() - limite.ventanaMs).toISOString()}::timestamp`;
  const ventanaVigente = sql`${formRateLimits.windowStart} > ${corte}`;

  const filas = await db
    .insert(formRateLimits)
    .values({ key, count: 1, windowStart: ahora })
    .onConflictDoUpdate({
      target: formRateLimits.key,
      set: {
        count: sql`case when ${ventanaVigente} then ${formRateLimits.count} + 1 else 1 end`,
        windowStart: sql`case when ${ventanaVigente} then ${formRateLimits.windowStart} else ${sql`${ahora.toISOString()}::timestamp`} end`,
      },
    })
    .returning({ conteo: formRateLimits.count, inicioVentana: formRateLimits.windowStart });

  return decidirSobreEstado(unicaFila(filas, "form_rate_limits"), limite, ahora);
}

/** Borra las ventanas vencidas (mantenimiento; la tabla es de vida corta). */
export async function purgarVentanasVencidas(anteriores: Date): Promise<void> {
  await db
    .delete(formRateLimits)
    .where(sql`${formRateLimits.windowStart} < ${sql`${anteriores.toISOString()}::timestamp`}`);
}
