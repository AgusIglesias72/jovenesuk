import { describe, expect, it } from "vitest";

import { buildBreadcrumb } from "./breadcrumb-labels";

const labels = (pathname: string) => buildBreadcrumb(pathname).map((c) => c.label);

describe("buildBreadcrumb", () => {
  it("usa el label del mapa para las raíces", () => {
    expect(labels("/dashboard")).toEqual(["Dashboard"]);
    expect(labels("/group-leaders")).toEqual(["Group Leaders"]);
    expect(labels("/configuracion")).toEqual(["Configuración"]);
  });

  it("capitaliza nuevo / editar / importar", () => {
    expect(labels("/alumnos/nuevo")).toEqual(["Alumnos", "Nuevo"]);
    expect(labels("/prospectos/importar")).toEqual(["Prospectos", "Importar"]);
  });

  it("formatea el DNI del alumno", () => {
    expect(labels("/alumnos/45102338/editar")).toEqual([
      "Alumnos",
      "45.102.338",
      "Editar",
    ]);
  });

  it("deja el código del viaje tal cual", () => {
    expect(labels("/viajes/UK-2026-JUL-LONDON")).toEqual([
      "Viajes",
      "UK-2026-JUL-LONDON",
    ]);
  });

  it("omite los uuids", () => {
    expect(labels("/group-leaders/6f2a1c3e-9b4d-4a51-8c77-1e2f3a4b5c6d/editar")).toEqual([
      "Group Leaders",
      "Editar",
    ]);
    expect(labels("/prospectos/6f2a1c3e-9b4d-4a51-8c77-1e2f3a4b5c6d")).toEqual([
      "Prospectos",
    ]);
  });

  it("solo el último crumb queda sin href", () => {
    const crumbs = buildBreadcrumb("/alumnos/45102338/editar");
    expect(crumbs.map((c) => c.href)).toEqual(["/alumnos", "/alumnos/45102338", undefined]);
  });

  it("la raíz vacía cae en Inicio", () => {
    expect(labels("/")).toEqual(["Inicio"]);
  });
});
