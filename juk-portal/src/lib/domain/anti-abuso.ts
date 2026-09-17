/**
 * Política anti-abuso de las superficies públicas (form de consulta,
 * newsletter y Application Form de inscripción): ventanas de rate limit y
 * dedup del aviso al equipo.
 *
 * Todo acá es puro y decide sobre timestamps: la persistencia de las ventanas
 * vive en `src/lib/db/queries/rate-limit-formularios.ts` y la lectura de la IP
 * en `src/lib/actions/anti-abuso-request.ts`. Sin captcha ni dependencias
 * externas (decisión 08/09/2026): el honeypot se mantiene y esto acota el
 * volumen por origen.
 */

export type FormularioPublico = "lead" | "newsletter" | "inscripcion";

export type VentanaRateLimit = {
  /** Intentos permitidos dentro de la ventana. */
  maximo: number;
  ventanaMs: number;
};

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;

/** Máximo 5 envíos por IP cada 10 minutos (consulta y newsletter). */
export const LIMITE_POR_IP: VentanaRateLimit = { maximo: 5, ventanaMs: 10 * MINUTO_MS };

/**
 * El Application Form tiene su propia ventana por IP, más ancha: varias
 * familias del mismo colegio completan la ficha desde la misma red (la del
 * colegio, la de una reunión de padres) o detrás del CGNAT del mismo proveedor,
 * y salen todas con la misma IP pública. Con 5 cada 10 minutos la sexta familia
 * se queda afuera por culpa de las otras cinco: justo el escenario para el que
 * se construyó el formulario. 20 deja pasar a una camada entera y sigue
 * cortando el scripteo.
 */
export const LIMITE_POR_IP_INSCRIPCION: VentanaRateLimit = {
  maximo: 20,
  ventanaMs: 10 * MINUTO_MS,
};

/** Máximo 3 envíos por email por hora. */
export const LIMITE_POR_EMAIL: VentanaRateLimit = { maximo: 3, ventanaMs: HORA_MS };

/**
 * Tercera dimensión, solo para los formularios que llegan por link tokenizado:
 * si un link se filtra (se reenvía a un grupo, queda en un buscador), el abuso
 * se corta por token sin castigar a la red compartida, que es lo que pasaría si
 * apretáramos la ventana por IP.
 */
export const LIMITE_POR_TOKEN: VentanaRateLimit = { maximo: 60, ventanaMs: HORA_MS };

/**
 * La APERTURA del link (la señal de que alguien abrió el formulario) tiene sus
 * propias ventanas y no toca las del envío. Son dos hechos distintos: si la
 * apertura gastara la cuota del envío, una familia que abre el link tres veces
 * —mira, cierra, vuelve con el pasaporte en la mano— se quedaría sin poder
 * mandar la ficha, que es lo único que no se puede perder.
 *
 * El registro es idempotente por invitación, así que esto no protege un dato:
 * acota cuánto trabajo puede pedir un link que se filtró. Por eso los números
 * son más holgados que los de un formulario que persiste.
 */
export const LIMITE_APERTURA_POR_TOKEN: VentanaRateLimit = { maximo: 30, ventanaMs: HORA_MS };

/**
 * Ventana por IP de la apertura, ancha por el mismo motivo que la del
 * Application Form: varias familias del mismo colegio (o detrás del CGNAT del
 * mismo proveedor) salen con una sola IP pública.
 */
export const LIMITE_APERTURA_POR_IP: VentanaRateLimit = {
  maximo: 60,
  ventanaMs: 10 * MINUTO_MS,
};

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

/** La ventana por IP que le corresponde a cada formulario. */
export function limiteIpDe(formulario: FormularioPublico): VentanaRateLimit {
  return formulario === "inscripcion" ? LIMITE_POR_IP_INSCRIPCION : LIMITE_POR_IP;
}

export function claveIp(formulario: FormularioPublico, ip: string): string {
  return `${formulario}:ip:${normalizarIp(ip)}`;
}

export function claveEmail(formulario: FormularioPublico, email: string): string {
  return `${formulario}:email:${normalizarEmail(email)}`;
}

const normalizarHash = (tokenHash: string) => tokenHash.trim().toLowerCase().slice(0, 128);

/**
 * Se indexa por el HASH del token, nunca por el token en claro: la tabla de
 * rate limit es de datos operativos y no tiene que poder abrir un link.
 */
export function claveToken(formulario: FormularioPublico, tokenHash: string): string {
  return `${formulario}:token:${normalizarHash(tokenHash)}`;
}

/**
 * Claves de la apertura. El prefijo `apertura:` no es un `FormularioPublico`, y
 * justamente por eso no puede chocar con ninguna de las de arriba: son ventanas
 * separadas, que es todo el punto.
 */
export function claveAperturaIp(ip: string): string {
  return `apertura:ip:${normalizarIp(ip)}`;
}

export function claveAperturaToken(tokenHash: string): string {
  return `apertura:token:${normalizarHash(tokenHash)}`;
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
