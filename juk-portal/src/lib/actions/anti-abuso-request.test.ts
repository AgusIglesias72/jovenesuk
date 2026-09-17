import { beforeEach, describe, expect, it, vi } from "vitest";

const incrementarYVerificar = vi.fn();
const captureException = vi.fn();
const getHeader = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (nombre: string) => getHeader(nombre) as string | null }),
}));
vi.mock("@/lib/db/queries/rate-limit-formularios", () => ({
  incrementarYVerificar: (...args: unknown[]) => incrementarYVerificar(...args),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { aperturaDentroDelLimite, dentroDelLimite, ipDelRequest } from "./anti-abuso-request";

const ahora = new Date("2026-09-16T12:00:00.000Z");

function decision(permitido: boolean) {
  return { permitido, conteo: 1, inicioVentana: ahora, reintentarEnMs: 0 };
}

/** Las claves que se fueron incrementando, en orden. */
function clavesIncrementadas(): string[] {
  return incrementarYVerificar.mock.calls.map((c) => c[0] as string);
}

beforeEach(() => {
  vi.resetAllMocks();
  getHeader.mockReturnValue(null);
  incrementarYVerificar.mockResolvedValue(decision(true));
});

describe("ipDelRequest", () => {
  it("toma la primera IP del x-forwarded-for", async () => {
    getHeader.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "203.0.113.7, 70.41.3.18" : null
    );

    await expect(ipDelRequest()).resolves.toBe("203.0.113.7");
  });

  it("cae a x-real-ip cuando no hay x-forwarded-for", async () => {
    getHeader.mockImplementation((n: string) => (n === "x-real-ip" ? "198.51.100.4" : null));

    await expect(ipDelRequest()).resolves.toBe("198.51.100.4");
  });

  it("sin headers confiables usa la clave compartida", async () => {
    await expect(ipDelRequest()).resolves.toBe("desconocida");
  });
});

describe("dentroDelLimite", () => {
  it("cuenta por IP y por email cuando no hay token", async () => {
    getHeader.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "203.0.113.7" : null
    );

    await expect(dentroDelLimite("lead", { email: " Ana@Example.COM " })).resolves.toBe(true);

    expect(clavesIncrementadas()).toEqual([
      "lead:ip:203.0.113.7",
      "lead:email:ana@example.com",
    ]);
  });

  it("no cuenta por token si no vino, ni con null ni con vacío", async () => {
    await dentroDelLimite("inscripcion", { email: "ana@example.com", tokenHash: null });
    await dentroDelLimite("inscripcion", { email: "ana@example.com", tokenHash: "" });

    expect(clavesIncrementadas().some((k) => k.includes(":token:"))).toBe(false);
  });

  it("incrementa las tres dimensiones en orden: IP, email y token", async () => {
    getHeader.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "203.0.113.7" : null
    );

    await expect(
      dentroDelLimite("inscripcion", { email: "ana@example.com", tokenHash: "A1B2" })
    ).resolves.toBe(true);

    expect(clavesIncrementadas()).toEqual([
      "inscripcion:ip:203.0.113.7",
      "inscripcion:email:ana@example.com",
      "inscripcion:token:a1b2",
    ]);
  });

  it("usa la ventana ancha por IP para el formulario de inscripción", async () => {
    await dentroDelLimite("inscripcion", { email: "ana@example.com" });

    expect(incrementarYVerificar.mock.calls[0]?.[1]).toEqual({ maximo: 20, ventanaMs: 600_000 });
  });

  it("deja intacta la ventana por IP del lead y del newsletter", async () => {
    await dentroDelLimite("lead", { email: "ana@example.com" });
    await dentroDelLimite("newsletter", { email: "ana@example.com" });

    expect(incrementarYVerificar.mock.calls[0]?.[1]).toEqual({ maximo: 5, ventanaMs: 600_000 });
    expect(incrementarYVerificar.mock.calls[2]?.[1]).toEqual({ maximo: 5, ventanaMs: 600_000 });
  });

  it("corta si el límite por IP se pasó", async () => {
    incrementarYVerificar.mockResolvedValueOnce(decision(false));

    await expect(dentroDelLimite("lead", { email: "ana@example.com" })).resolves.toBe(false);
  });

  it("corta si el límite por email se pasó", async () => {
    incrementarYVerificar
      .mockResolvedValueOnce(decision(true))
      .mockResolvedValueOnce(decision(false));

    await expect(dentroDelLimite("lead", { email: "ana@example.com" })).resolves.toBe(false);
  });

  it("corta si el link tokenizado se pasó, aunque IP y email estén bien", async () => {
    incrementarYVerificar
      .mockResolvedValueOnce(decision(true))
      .mockResolvedValueOnce(decision(true))
      .mockResolvedValueOnce(decision(false));

    await expect(
      dentroDelLimite("inscripcion", { email: "ana@example.com", tokenHash: "a1b2" })
    ).resolves.toBe(false);
  });

  it("igual gasta cuota en las otras ventanas cuando una ya frenó el intento", async () => {
    incrementarYVerificar.mockResolvedValueOnce(decision(false));

    await dentroDelLimite("inscripcion", { email: "ana@example.com", tokenHash: "a1b2" });

    expect(incrementarYVerificar).toHaveBeenCalledTimes(3);
  });

  it("falla abierto y reporta a Sentry si la tabla de rate limit se cae", async () => {
    const fallo = new Error("db caída");
    incrementarYVerificar.mockRejectedValue(fallo);

    await expect(dentroDelLimite("lead", { email: "ana@example.com" })).resolves.toBe(true);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(fallo);
  });
});

describe("aperturaDentroDelLimite", () => {
  it("cuenta por IP y por token, en claves que no son las del envío", async () => {
    getHeader.mockImplementation((n: string) =>
      n === "x-forwarded-for" ? "203.0.113.7" : null
    );

    await expect(aperturaDentroDelLimite("A1B2")).resolves.toBe(true);

    expect(clavesIncrementadas()).toEqual(["apertura:ip:203.0.113.7", "apertura:token:a1b2"]);
  });

  it("no cuenta por email: en la apertura nadie tipeó nada todavía", async () => {
    await aperturaDentroDelLimite("a1b2");

    expect(clavesIncrementadas().some((k) => k.includes(":email:"))).toBe(false);
  });

  it("usa sus propias ventanas, más holgadas que las del formulario", async () => {
    await aperturaDentroDelLimite("a1b2");

    expect(incrementarYVerificar.mock.calls[0]?.[1]).toEqual({ maximo: 60, ventanaMs: 600_000 });
    expect(incrementarYVerificar.mock.calls[1]?.[1]).toEqual({ maximo: 30, ventanaMs: 3_600_000 });
  });

  it("corta si el link se pasó de su ventana, aunque la IP esté bien", async () => {
    incrementarYVerificar
      .mockResolvedValueOnce(decision(true))
      .mockResolvedValueOnce(decision(false));

    await expect(aperturaDentroDelLimite("a1b2")).resolves.toBe(false);
  });

  it("igual gasta cuota en las dos ventanas cuando la IP ya frenó el intento", async () => {
    incrementarYVerificar.mockResolvedValueOnce(decision(false));

    await expect(aperturaDentroDelLimite("a1b2")).resolves.toBe(false);
    expect(incrementarYVerificar).toHaveBeenCalledTimes(2);
  });

  it("falla abierto: una métrica no puede romper la pantalla de la familia", async () => {
    const fallo = new Error("db caída");
    incrementarYVerificar.mockRejectedValue(fallo);

    await expect(aperturaDentroDelLimite("a1b2")).resolves.toBe(true);

    expect(captureException).toHaveBeenCalledWith(fallo);
  });
});
