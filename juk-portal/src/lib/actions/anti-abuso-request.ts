import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

import { incrementarYVerificar } from "@/lib/db/queries/rate-limit-formularios";
import {
  LIMITE_POR_EMAIL,
  LIMITE_POR_TOKEN,
  claveEmail,
  claveIp,
  claveToken,
  limiteIpDe,
  normalizarIp,
  type FormularioPublico,
} from "@/lib/domain/anti-abuso";

/**
 * Enganche entre la política pura de `@/lib/domain/anti-abuso` y el request:
 * lee la IP de los headers y registra el intento en cada ventana. Lo comparten
 * los formularios públicos (consulta, newsletter y el Application Form), que
 * son los únicos que corren sin sesión.
 */

/** La IP del cliente, de los headers que pone el proxy. */
export async function ipDelRequest(): Promise<string> {
  const h = await headers();
  return normalizarIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
}

export type DimensionesLimite = {
  email: string;
  /** Hash del token del link, para los formularios que llegan por invitación. */
  tokenHash?: string | null;
};

/**
 * Registra el intento en todas las ventanas que apliquen (IP, email y, si el
 * formulario llegó por un link tokenizado, token) y dice si sigue.
 *
 * Las ventanas se incrementan TODAS antes de decidir: si cortáramos en la
 * primera que falla, el abusivo dejaría de gastar cuota en las otras
 * dimensiones y volvería a pasar apenas se le libere la que lo frenó.
 *
 * Falla abierto a propósito: un problema con la tabla de rate limit no puede
 * costarnos un lead legítimo ni una inscripción (el honeypot y la validación
 * siguen en pie).
 */
export async function dentroDelLimite(
  formulario: FormularioPublico,
  dimensiones: DimensionesLimite
): Promise<boolean> {
  try {
    const ahora = new Date();
    const porIp = await incrementarYVerificar(
      claveIp(formulario, await ipDelRequest()),
      limiteIpDe(formulario),
      ahora
    );
    const porEmail = await incrementarYVerificar(
      claveEmail(formulario, dimensiones.email),
      LIMITE_POR_EMAIL,
      ahora
    );

    const tokenHash = dimensiones.tokenHash;
    const porToken =
      tokenHash === undefined || tokenHash === null || tokenHash === ""
        ? null
        : await incrementarYVerificar(
            claveToken(formulario, tokenHash),
            LIMITE_POR_TOKEN,
            ahora
          );

    return porIp.permitido && porEmail.permitido && (porToken === null || porToken.permitido);
  } catch (err) {
    Sentry.captureException(err);
    return true;
  }
}
