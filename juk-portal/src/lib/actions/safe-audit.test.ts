import { beforeEach, describe, expect, it, vi } from "vitest";

const registrarAuditoria = vi.fn();
const captureException = vi.fn();

vi.mock("@/lib/db/queries/auditoria", () => ({
  registrarAuditoria: (...args: unknown[]) => registrarAuditoria(...args),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { safeAudit } from "./safe-audit";

const entry = {
  accion: "update" as const,
  entidadTipo: "alumno" as const,
  entidadId: "00000000-0000-0000-0000-000000000001",
  usuarioId: null,
};

describe("safeAudit", () => {
  beforeEach(() => {
    registrarAuditoria.mockReset();
    captureException.mockReset();
  });

  it("delega en registrarAuditoria con la entrada tal cual", async () => {
    registrarAuditoria.mockResolvedValue(undefined);

    await safeAudit(entry);

    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
    expect(registrarAuditoria).toHaveBeenCalledWith(entry);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("si la auditoría falla, no lanza y reporta a Sentry", async () => {
    const fallo = new Error("db caída");
    registrarAuditoria.mockRejectedValue(fallo);

    await expect(safeAudit(entry)).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(fallo);
  });
});
