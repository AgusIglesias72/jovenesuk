import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  buscarFaltantes,
  cambiosDesdeGit,
  esSoloTipos,
  exigeTestPorRuta,
  parsearCambios,
} from "./check-test-companions.mjs";

const LOGICA = "export function sumar(a: number, b: number) {\n  return a + b;\n}\n";

function fsFalso(archivos) {
  return {
    existe: (r) => Object.prototype.hasOwnProperty.call(archivos, r),
    leer: (r) => archivos[r] ?? "",
  };
}

describe("buscarFaltantes", () => {
  it("falla con un archivo de dominio nuevo sin test", () => {
    const fs = fsFalso({ "src/lib/domain/cuotas/plan.ts": LOGICA });
    expect(buscarFaltantes(parsearCambios(["A\tsrc/lib/domain/cuotas/plan.ts"]), fs)).toEqual([
      "src/lib/domain/cuotas/plan.ts",
    ]);
  });

  it("pasa si el test compañero existe (aunque no esté en el cambio)", () => {
    const fs = fsFalso({
      "src/lib/domain/cuotas/plan.ts": LOGICA,
      "src/lib/domain/cuotas/plan.test.ts": "",
    });
    expect(buscarFaltantes(parsearCambios(["M\tsrc/lib/domain/cuotas/plan.ts"]), fs)).toEqual([]);
  });

  it("acepta .test.tsx como compañero de un .tsx", () => {
    const fs = fsFalso({
      "src/lib/utils/render.tsx": LOGICA,
      "src/lib/utils/render.test.tsx": "",
    });
    expect(buscarFaltantes(parsearCambios(["src/lib/utils/render.tsx"]), fs)).toEqual([]);
  });

  it("un .integration.test.ts no cuenta como compañero (no corre en npm test)", () => {
    const fs = fsFalso({
      "src/lib/actions/cobrar.ts": LOGICA,
      "src/lib/actions/cobrar.integration.test.ts": "",
    });
    expect(buscarFaltantes(parsearCambios(["src/lib/actions/cobrar.ts"]), fs)).toEqual([
      "src/lib/actions/cobrar.ts",
    ]);
  });

  it("no exige test a index.ts, labels.ts ni errors.ts", () => {
    const rutas = [
      "src/lib/domain/viajes/index.ts",
      "src/lib/domain/viajes/labels.ts",
      "src/lib/domain/viajes/errors.ts",
    ];
    const fs = fsFalso(Object.fromEntries(rutas.map((r) => [r, LOGICA])));
    expect(buscarFaltantes(parsearCambios(rutas), fs)).toEqual([]);
  });

  it("no exige test a un archivo borrado", () => {
    expect(buscarFaltantes(parsearCambios(["D\tsrc/lib/domain/viejo.ts"]), fsFalso({}))).toEqual([]);
    expect(buscarFaltantes(parsearCambios(["src/lib/domain/viejo.ts"]), fsFalso({}))).toEqual([]);
  });

  it("ignora carpetas fuera del contrato", () => {
    const fs = fsFalso({ "src/lib/db/queries/cuotas.ts": LOGICA, "src/app/page.tsx": LOGICA });
    expect(
      buscarFaltantes(parsearCambios(["src/lib/db/queries/cuotas.ts", "src/app/page.tsx"]), fs),
    ).toEqual([]);
  });

  it("toma el destino de un rename y normaliza rutas desde la raíz del repo", () => {
    const fs = fsFalso({ "src/lib/utils/fecha.ts": LOGICA });
    const cambios = parsearCambios(["R087\tjuk-portal/src/lib/utils/date.ts\tjuk-portal/src/lib/utils/fecha.ts"]);
    expect(cambios).toEqual([{ estado: "A", ruta: "src/lib/utils/fecha.ts" }]);
    expect(buscarFaltantes(cambios, fs)).toEqual(["src/lib/utils/fecha.ts"]);
  });

  it("normaliza separadores de Windows", () => {
    expect(parsearCambios(["juk-portal\\src\\lib\\domain\\a.ts\r"])).toEqual([
      { estado: "?", ruta: "src/lib/domain/a.ts" },
    ]);
  });

  it("no exige test a un archivo que solo declara tipos", () => {
    const fs = fsFalso({
      "src/lib/domain/tipos-pago.ts":
        'import type { z } from "zod";\n// const ejemplo = 1\nexport type Pago = { const: string };\nexport interface Cuota { monto: number }\n',
    });
    expect(buscarFaltantes(parsearCambios(["src/lib/domain/tipos-pago.ts"]), fs)).toEqual([]);
  });
});

describe("esSoloTipos", () => {
  it.each([
    ["export const esquema = z.object({});", false],
    ["export default function x() {}", false],
    ["export async function x() {}", false],
    ["class Error2 extends Error {}", false],
    ['export * from "./a";', false],
    ['export { a } from "./a";', false],
    ["export type A = string;\n/* export const b = 1; */", true],
    ['export type { A } from "./a";', true],
  ])("%s → %s", (codigo, esperado) => {
    expect(esSoloTipos(codigo)).toBe(esperado);
  });
});

describe("exigeTestPorRuta", () => {
  it.each([
    ["src/lib/domain/a.ts", true],
    ["src/lib/actions/result.ts", true],
    ["src/lib/domain/a.test.ts", false],
    ["src/lib/domain/a.integration.test.ts", false],
    ["src/lib/domain/tipos.d.ts", false],
    ["src/lib/actions/__tests__/mock-sesion.ts", false],
    ["src/lib/domain/types.ts", false],
    ["src/lib/domain/README.md", false],
  ])("%s → %s", (ruta, esperado) => {
    expect(exigeTestPorRuta(ruta)).toBe(esperado);
  });
});

describe("cambiosDesdeGit", () => {
  function gitFalso(respuestas) {
    const llamadas = [];
    const git = (args) => {
      llamadas.push(args.join(" "));
      const clave = Object.keys(respuestas).find((k) => args.join(" ").startsWith(k));
      return clave === undefined ? null : respuestas[clave];
    };
    return { git, llamadas };
  }

  it("auto: usa origin/main, compara contra el merge-base y suma los no trackeados", () => {
    const { git, llamadas } = gitFalso({
      "rev-parse --verify --quiet origin/main^{commit}": "abc\n",
      "merge-base origin/main HEAD": "mb123\n",
      "diff --name-status -M --relative mb123": "M\tsrc/lib/domain/a.ts\nD\tsrc/lib/domain/b.ts\n",
      "ls-files --others --exclude-standard": "src/lib/utils/nuevo.ts\n",
    });
    const r = cambiosDesdeGit("auto", git, {});
    expect(r?.base).toBe("origin/main");
    expect(r?.cambios).toEqual([
      { estado: "M", ruta: "src/lib/domain/a.ts" },
      { estado: "D", ruta: "src/lib/domain/b.ts" },
      { estado: "A", ruta: "src/lib/utils/nuevo.ts" },
    ]);
    expect(llamadas).toContain("diff --name-status -M --relative mb123");
  });

  it("auto: sin origin/main cae a HEAD~1, y CHECK_TESTS_BASE tiene prioridad", () => {
    const sinOrigin = gitFalso({ "rev-parse --verify --quiet HEAD~1^{commit}": "x", "merge-base": "m" });
    expect(cambiosDesdeGit("auto", sinOrigin.git, {})?.base).toBe("HEAD~1");

    const conEnv = gitFalso({
      "rev-parse --verify --quiet origin/develop^{commit}": "x",
      "rev-parse --verify --quiet origin/main^{commit}": "x",
      "merge-base": "m",
    });
    expect(cambiosDesdeGit("auto", conEnv.git, { CHECK_TESTS_BASE: "origin/develop" })?.base).toBe(
      "origin/develop",
    );
  });

  it("devuelve null si la base no existe (primer commit, clone shallow)", () => {
    expect(cambiosDesdeGit("auto", gitFalso({}).git, {})).toBeNull();
    expect(cambiosDesdeGit("origin/main", gitFalso({}).git, {})).toBeNull();
  });
});

describe("CLI", () => {
  const script = fileURLToPath(new URL("./check-test-companions.mjs", import.meta.url));
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  function correr(args) {
    return spawnSync(process.execPath, [script, "--app-dir", dir, ...args], { encoding: "utf8" });
  }

  it("sale con 1 y lista el faltante; con 0 cuando el test existe", () => {
    dir = mkdtempSync(path.join(tmpdir(), "check-tests-"));
    mkdirSync(path.join(dir, "src/lib/domain"), { recursive: true });
    writeFileSync(path.join(dir, "src/lib/domain/plan.ts"), LOGICA);

    const sinTest = correr(["src/lib/domain/plan.ts"]);
    expect(sinTest.status).toBe(1);
    expect(sinTest.stderr).toContain("src/lib/domain/plan.ts");

    writeFileSync(path.join(dir, "src/lib/domain/plan.test.ts"), "");
    expect(correr(["src/lib/domain/plan.ts"]).status).toBe(0);
  });

  it("lee líneas de --stdin", () => {
    dir = mkdtempSync(path.join(tmpdir(), "check-tests-"));
    mkdirSync(path.join(dir, "src/lib/utils"), { recursive: true });
    writeFileSync(path.join(dir, "src/lib/utils/dni.ts"), LOGICA);
    const r = spawnSync(process.execPath, [script, "--app-dir", dir, "--stdin"], {
      encoding: "utf8",
      input: "A\tjuk-portal/src/lib/utils/dni.ts\n",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("src/lib/utils/dni.ts");
  });
});
