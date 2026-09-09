import { describe, expect, it } from "vitest";

import {
  IP_DESCONOCIDA,
  LIMITE_POR_EMAIL,
  LIMITE_POR_IP,
  VENTANA_DEDUP_AVISO_MS,
  aplicarIntento,
  claveEmail,
  claveIp,
  debeAvisarConsulta,
  decidirSobreEstado,
  evaluarVentana,
  normalizarEmail,
  normalizarIp,
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
