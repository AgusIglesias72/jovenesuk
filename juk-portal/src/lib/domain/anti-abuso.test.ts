import { describe, expect, it } from "vitest";

import {
  IP_DESCONOCIDA,
  LIMITE_APERTURA_POR_IP,
  LIMITE_APERTURA_POR_TOKEN,
  LIMITE_POR_EMAIL,
  LIMITE_POR_IP,
  LIMITE_POR_IP_INSCRIPCION,
  LIMITE_POR_TOKEN,
  VENTANA_DEDUP_AVISO_MS,
  aplicarIntento,
  claveAperturaIp,
  claveAperturaToken,
  claveEmail,
  claveIp,
  claveToken,
  debeAvisarConsulta,
  decidirSobreEstado,
  evaluarVentana,
  limiteIpDe,
  normalizarEmail,
  normalizarIp,
  type EstadoVentana,
  type VentanaRateLimit,
} from "./anti-abuso";

const ahora = new Date("2026-09-08T12:00:00.000Z");
const enMinutos = (m: number) => new Date(ahora.getTime() + m * 60_000);

describe("aplicarIntento", () => {
  it("arranca una ventana nueva cuando no hay estado previo", () => {
    expect(aplicarIntento(null, LIMITE_POR_IP, ahora)).toEqual({
      conteo: 1,
      inicioVentana: ahora,
    });
  });

  it("suma dentro de la ventana vigente y conserva su inicio", () => {
    const previo = { conteo: 2, inicioVentana: ahora };
    expect(aplicarIntento(previo, LIMITE_POR_IP, enMinutos(9))).toEqual({
      conteo: 3,
      inicioVentana: ahora,
    });
  });

  it("reinicia la ventana cuando venció", () => {
    const previo = { conteo: 5, inicioVentana: ahora };
    const reinicio = enMinutos(10);
    expect(aplicarIntento(previo, LIMITE_POR_IP, reinicio)).toEqual({
      conteo: 1,
      inicioVentana: reinicio,
    });
  });
});

describe("decidirSobreEstado", () => {
  it("permite hasta el máximo inclusive", () => {
    expect(
      decidirSobreEstado({ conteo: 5, inicioVentana: ahora }, LIMITE_POR_IP, ahora).permitido
    ).toBe(true);
  });

  it("rechaza al superar el máximo e informa cuánto falta", () => {
    const d = decidirSobreEstado({ conteo: 6, inicioVentana: ahora }, LIMITE_POR_IP, enMinutos(4));
    expect(d.permitido).toBe(false);
    expect(d.reintentarEnMs).toBe(6 * 60_000);
  });

  it("nunca devuelve un tiempo de espera negativo", () => {
    const d = decidirSobreEstado({ conteo: 9, inicioVentana: ahora }, LIMITE_POR_IP, enMinutos(30));
    expect(d.reintentarEnMs).toBe(0);
  });
});

describe("evaluarVentana (política por IP: 5 cada 10 min)", () => {
  it("deja pasar 5 envíos seguidos y frena el sexto", () => {
    let estado: { conteo: number; inicioVentana: Date } | null = null;
    const resultados: boolean[] = [];

    for (let i = 0; i < 6; i += 1) {
      const t = new Date(ahora.getTime() + i * 1_000);
      const decision = evaluarVentana(estado, LIMITE_POR_IP, t);
      resultados.push(decision.permitido);
      estado = { conteo: decision.conteo, inicioVentana: decision.inicioVentana };
    }

    expect(resultados).toEqual([true, true, true, true, true, false]);
  });

  it("vuelve a permitir pasada la ventana", () => {
    const bloqueado = { conteo: 9, inicioVentana: ahora };
    expect(evaluarVentana(bloqueado, LIMITE_POR_IP, enMinutos(11)).permitido).toBe(true);
  });
});

describe("evaluarVentana (política por email: 3 por hora)", () => {
  it("frena el cuarto envío del mismo email dentro de la hora", () => {
    const previo = { conteo: 3, inicioVentana: ahora };
    expect(evaluarVentana(previo, LIMITE_POR_EMAIL, enMinutos(59)).permitido).toBe(false);
  });

  it("permite de nuevo pasada la hora", () => {
    const previo = { conteo: 3, inicioVentana: ahora };
    expect(evaluarVentana(previo, LIMITE_POR_EMAIL, enMinutos(60)).permitido).toBe(true);
  });
});

/** Corre `cantidad` intentos seguidos sobre la misma ventana y devuelve si pasó cada uno. */
function simularSeguidos(
  limite: VentanaRateLimit,
  cantidad: number,
  separacionMs = 1_000
): boolean[] {
  let estado: EstadoVentana | null = null;
  const permitidos: boolean[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const decision = evaluarVentana(
      estado,
      limite,
      new Date(ahora.getTime() + i * separacionMs)
    );
    permitidos.push(decision.permitido);
    estado = { conteo: decision.conteo, inicioVentana: decision.inicioVentana };
  }

  return permitidos;
}

describe("límite por IP del formulario de inscripción (20 cada 10 min)", () => {
  it("deja pasar a seis familias del mismo colegio dentro de los diez minutos", () => {
    // Seis envíos desde la misma IP pública, uno por minuto.
    const permitidos = simularSeguidos(LIMITE_POR_IP_INSCRIPCION, 6, 60_000);

    expect(permitidos).toEqual([true, true, true, true, true, true]);
  });

  it("con la ventana del lead, esas mismas seis familias se bloquearían entre sí", () => {
    const permitidos = simularSeguidos(LIMITE_POR_IP, 6, 60_000);

    expect(permitidos[5]).toBe(false);
  });

  it("igual corta el scripteo: el envío 21 dentro de la ventana no pasa", () => {
    const permitidos = simularSeguidos(LIMITE_POR_IP_INSCRIPCION, 21);

    expect(permitidos.slice(0, 20).every(Boolean)).toBe(true);
    expect(permitidos[20]).toBe(false);
  });
});

describe("limiteIpDe", () => {
  it("le da al formulario de inscripción su ventana ancha", () => {
    expect(limiteIpDe("inscripcion")).toEqual({ maximo: 20, ventanaMs: 10 * 60_000 });
  });

  it("no toca la ventana de lead ni la de newsletter (regresión: 5 cada 10 min)", () => {
    expect(limiteIpDe("lead")).toEqual({ maximo: 5, ventanaMs: 10 * 60_000 });
    expect(limiteIpDe("newsletter")).toEqual({ maximo: 5, ventanaMs: 10 * 60_000 });
    expect(LIMITE_POR_IP).toEqual({ maximo: 5, ventanaMs: 10 * 60_000 });
  });
});

describe("límite por token (60 por hora)", () => {
  it("permite 60 envíos del mismo link y corta el 61", () => {
    const permitidos = simularSeguidos(LIMITE_POR_TOKEN, 61);

    expect(permitidos.slice(0, 60).every(Boolean)).toBe(true);
    expect(permitidos[60]).toBe(false);
  });

  it("vuelve a permitir pasada la hora", () => {
    const bloqueado = { conteo: 61, inicioVentana: ahora };
    expect(evaluarVentana(bloqueado, LIMITE_POR_TOKEN, enMinutos(60)).permitido).toBe(true);
  });
});

describe("normalizarIp", () => {
  it("toma la primera IP de la cadena de proxies", () => {
    expect(normalizarIp("203.0.113.7, 70.41.3.18, 150.172.238.178")).toBe("203.0.113.7");
  });

  it("cae a una clave compartida sin header", () => {
    expect(normalizarIp(null)).toBe(IP_DESCONOCIDA);
    expect(normalizarIp("   ")).toBe(IP_DESCONOCIDA);
    expect(normalizarIp(undefined)).toBe(IP_DESCONOCIDA);
  });
});

describe("claves", () => {
  it("separan formulario, dimensión y valor normalizado", () => {
    expect(claveIp("lead", " 203.0.113.7 , 10.0.0.1")).toBe("lead:ip:203.0.113.7");
    expect(claveEmail("newsletter", "  Ana@Example.COM ")).toBe("newsletter:email:ana@example.com");
  });

  it("no comparte cuota entre el lead y el newsletter", () => {
    expect(claveIp("lead", "203.0.113.7")).not.toBe(claveIp("newsletter", "203.0.113.7"));
  });

  it("la clave por token no colisiona con la de IP ni con la de email", () => {
    const mismoValor = "abc123";

    expect(claveToken("inscripcion", mismoValor)).not.toBe(claveIp("inscripcion", mismoValor));
    expect(claveToken("inscripcion", mismoValor)).not.toBe(claveEmail("inscripcion", mismoValor));
    expect(claveToken("inscripcion", mismoValor)).toBe("inscripcion:token:abc123");
  });

  it("normaliza el hash del token y no comparte cuota entre formularios", () => {
    expect(claveToken("inscripcion", "  A1B2C3  ")).toBe("inscripcion:token:a1b2c3");
    expect(claveToken("inscripcion", "a1b2c3")).not.toBe(claveToken("lead", "a1b2c3"));
  });

  it("la apertura del link tiene claves propias: no puede gastar la cuota del envío", () => {
    // Abrir el formulario cinco veces no puede dejar a una familia sin poder
    // mandar la ficha: son dos ventanas separadas, y esto lo garantiza.
    expect(claveAperturaToken("A1B2C3")).toBe("apertura:token:a1b2c3");
    expect(claveAperturaToken("a1b2c3")).not.toBe(claveToken("inscripcion", "a1b2c3"));
    expect(claveAperturaIp(" 203.0.113.7 , 10.0.0.1")).toBe("apertura:ip:203.0.113.7");
    expect(claveAperturaIp("203.0.113.7")).not.toBe(claveIp("inscripcion", "203.0.113.7"));
    expect(claveAperturaIp("abc123")).not.toBe(claveAperturaToken("abc123"));
  });
});

describe("límites de la apertura del link", () => {
  it("permite 30 aperturas del mismo link por hora y corta la 31", () => {
    const permitidos = simularSeguidos(LIMITE_APERTURA_POR_TOKEN, 31);

    expect(permitidos.slice(0, 30).every(Boolean)).toBe(true);
    expect(permitidos[30]).toBe(false);
  });

  it("la ventana por IP es ancha: un colegio entero abre el link desde una sola IP", () => {
    expect(LIMITE_APERTURA_POR_IP.maximo).toBeGreaterThan(LIMITE_POR_IP.maximo);
    expect(simularSeguidos(LIMITE_APERTURA_POR_IP, 60).every(Boolean)).toBe(true);
  });
});

describe("normalizarEmail", () => {
  it("recorta y baja a minúsculas", () => {
    expect(normalizarEmail(" Ana@Example.com ")).toBe("ana@example.com");
  });
});

describe("debeAvisarConsulta (dedup del aviso, 24 h)", () => {
  it("avisa si no hubo una consulta previa igual", () => {
    expect(debeAvisarConsulta(null, ahora)).toBe(true);
  });

  it("no avisa si la previa entra en la ventana de 24 h", () => {
    const previa = new Date(ahora.getTime() - VENTANA_DEDUP_AVISO_MS + 60_000);
    expect(debeAvisarConsulta(previa, ahora)).toBe(false);
  });

  it("vuelve a avisar pasadas las 24 h", () => {
    const previa = new Date(ahora.getTime() - VENTANA_DEDUP_AVISO_MS);
    expect(debeAvisarConsulta(previa, ahora)).toBe(true);
  });
});
