/**
 * Política anti-abuso de las superficies públicas (form de consulta y
 * newsletter): ventanas de rate limit y dedup del aviso al equipo.
 *
 * Todo acá es puro y decide sobre timestamps: la persistencia de las ventanas
 * vive en `src/lib/db/queries/rate-limit-formularios.ts` y la lectura de la IP
 * en la server action. Sin captcha ni dependencias externas (decisión
 * 08/09/2026): el honeypot se mantiene y esto acota el volumen por origen.
 */

export type FormularioPublico = "lead" | "newsletter";

export type VentanaRateLimit = {
  /** Intentos permitidos dentro de la ventana. */
  maximo: number;
  ventanaMs: number;
};

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;

/** Máximo 5 envíos por IP cada 10 minutos. */
export const LIMITE_POR_IP: VentanaRateLimit = { maximo: 5, ventanaMs: 10 * MINUTO_MS };

/** Máximo 3 envíos por email por hora. */
export const LIMITE_POR_EMAIL: VentanaRateLimit = { maximo: 3, ventanaMs: HORA_MS };

/** Un mismo email + interés no vuelve a disparar el aviso al equipo por 24 h. */
export const VENTANA_DEDUP_AVISO_MS = 24 * HORA_MS;

export const IP_DESCONOCIDA = "desconocida";

/** Estado persistido de una ventana: cuántos intentos van y desde cuándo. */
export type EstadoVentana = {
  conteo: number;
  inicioVentana: Date;
};

export type DecisionRateLimit = {
  permitido: boolean;
  conteo: number;
  inicioVentana: Date;
  /** Milisegundos que faltan para que la ventana se reinicie. */
  reintentarEnMs: number;
};

/**
 * Aplica un intento sobre el estado previo: si la ventana sigue vigente suma
 * uno, y si venció arranca una ventana nueva en `ahora`.
 */
export function aplicarIntento(
  previo: EstadoVentana | null,
  limite: VentanaRateLimit,
  ahora: Date
): EstadoVentana {
  const vigente =
    previo !== null && ahora.getTime() - previo.inicioVentana.getTime() < limite.ventanaMs;

  return vigente
    ? { conteo: previo.conteo + 1, inicioVentana: previo.inicioVentana }
    : { conteo: 1, inicioVentana: ahora };
}

/** Decide sobre un estado YA incrementado (lo que devuelve el upsert atómico). */
export function decidirSobreEstado(
  estado: EstadoVentana,
  limite: VentanaRateLimit,
  ahora: Date
): DecisionRateLimit {
  const transcurrido = ahora.getTime() - estado.inicioVentana.getTime();
  return {
    permitido: estado.conteo <= limite.maximo,
    conteo: estado.conteo,
    inicioVentana: estado.inicioVentana,
    reintentarEnMs: Math.max(0, limite.ventanaMs - transcurrido),
  };
}

/** Atajo para decidir en memoria (tests y cualquier store no atómico). */
export function evaluarVentana(
  previo: EstadoVentana | null,
  limite: VentanaRateLimit,
  ahora: Date
): DecisionRateLimit {
  return decidirSobreEstado(aplicarIntento(previo, limite, ahora), limite, ahora);
}

/**
 * Primera IP del `x-forwarded-for` (la del cliente; el resto son proxies).
 * Sin header confiable, todo el tráfico cae en una única clave compartida.
 */
export function normalizarIp(header: string | null | undefined): string {
  const primera = (header ?? "").split(",")[0]?.trim() ?? "";
  return primera === "" ? IP_DESCONOCIDA : primera.slice(0, 64).toLowerCase();
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function claveIp(formulario: FormularioPublico, ip: string): string {
  return `${formulario}:ip:${normalizarIp(ip)}`;
}

export function claveEmail(formulario: FormularioPublico, email: string): string {
  return `${formulario}:email:${normalizarEmail(email)}`;
}

/**
 * Dedup del AVISO (no del lead): la consulta se persiste siempre, pero si el
 * mismo email ya consultó por el mismo interés en las últimas 24 h no se
 * vuelve a gastar cuota de Trigger/Resend ni a saturar la casilla del equipo.
 */
export function debeAvisarConsulta(previaEl: Date | null, ahora: Date): boolean {
  if (previaEl === null) return true;
  return ahora.getTime() - previaEl.getTime() >= VENTANA_DEDUP_AVISO_MS;
}
