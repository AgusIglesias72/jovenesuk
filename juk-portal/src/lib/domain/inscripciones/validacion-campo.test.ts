import { describe, expect, it } from "vitest";

import { inscripcionSchema, MENSAJE_FECHA_INVALIDA } from "./schema";
import {
  AVISO_PASAPORTE_VENCIDO,
  avisoDelCampo,
  CAMPOS_EN_VIVO,
  esCampoEnVivo,
  esCaracterImposible,
  validarCampoInscripcion,
} from "./validacion-campo";

const HOY = new Date("2026-09-18T12:00:00Z");

/** Un valor válido por campo, para el test de contrato del final. */
const VALIDOS: Record<string, string> = {
  nombre: "Milagros",
  apellido: "Sosa",
  fechaNacimiento: "2009-04-12",
  dni: "45.102.338",
  numeroPasaporte: "AAF123456",
  fechaVencimientoPasaporte: "2031-08-30",
  tutor1Nombre: "Vanina Sosa",
  tutor1Celular: "+54 9 11 5555-0000",
  tutor1Email: "vanina@example.com",
  telefonoAlumno: "",
  emailAlumno: "",
  alergiasSalud: "",
  preferenciasAlojamiento: "",
  nivelInglesAutoevaluacion: "",
};

describe("validarCampoInscripcion", () => {
  it("el DNI con una letra dice que va solo con números, no que le faltan dígitos", () => {
    // El pedido textual del dueño: "si en DNI ponen una letra marquemos en el
    // momento que está mal".
    expect(validarCampoInscripcion("dni", "45102a")).toBe("El DNI va solo con números.");
  });

  it("el DNI sigue aceptando puntos, espacios y guiones", () => {
    for (const dni of ["45.102.338", " 45 102 338 ", "45-102-338"]) {
      expect(validarCampoInscripcion("dni", dni), dni).toBeUndefined();
    }
  });

  it("un campo opcional vacío no marca nada", () => {
    expect(validarCampoInscripcion("telefonoAlumno", "")).toBeUndefined();
    expect(validarCampoInscripcion("emailAlumno", "")).toBeUndefined();
    expect(validarCampoInscripcion("alergiasSalud", "")).toBeUndefined();
  });

  it("un campo obligatorio vacío pide el dato, sin hablar de formato", () => {
    expect(validarCampoInscripcion("nombre", "")).toBe("Ingresá el nombre");
    expect(validarCampoInscripcion("fechaNacimiento", "")).toBe(
      "Ingresá la fecha de nacimiento"
    );
  });

  it("la fecha imposible se distingue de la fecha que falta", () => {
    expect(validarCampoInscripcion("fechaNacimiento", "2009-02-31")).toBe(
      MENSAJE_FECHA_INVALIDA
    );
  });

  it("el consentimiento se coerciona como lo manda un form HTML", () => {
    expect(validarCampoInscripcion("acepta", "")).toBe("Tenés que aceptar para continuar");
    expect(validarCampoInscripcion("acepta", "on")).toBeUndefined();
  });

  it("el celular del E2E y el que escribe una familia pasan igual", () => {
    expect(validarCampoInscripcion("tutor1Celular", "+54 9 11 5555-0000")).toBeUndefined();
    expect(validarCampoInscripcion("tutor1Celular", "1234")).toBe(
      "Poné el celular con el código de área (al menos 8 números)."
    );
  });
});

describe("esCaracterImposible", () => {
  it("una letra en el DNI se marca en el acto", () => {
    expect(esCaracterImposible("dni", "45102a")).toBe(true);
  });

  it("un DNI a medio escribir NO se marca", () => {
    // El criterio de UX: mientras escribe por primera vez no se le grita.
    for (const parcial of ["4", "45.", "45.102.", ""]) {
      expect(esCaracterImposible("dni", parcial), `«${parcial}»`).toBe(false);
    }
  });

  it("el celular con +, espacios y guiones no es un carácter imposible", () => {
    expect(esCaracterImposible("tutor1Celular", "+54 9 11 5555-0000")).toBe(false);
    expect(esCaracterImposible("tutor1Celular", "+54 9 11 llamame")).toBe(true);
  });

  it("un email a medio tipear no se marca; un espacio o un segundo @ sí", () => {
    for (const parcial of ["v", "vanina", "vanina@", "vanina@exa"]) {
      expect(esCaracterImposible("tutor1Email", parcial), `«${parcial}»`).toBe(false);
    }
    expect(esCaracterImposible("tutor1Email", "vani na@example.com")).toBe(true);
    expect(esCaracterImposible("tutor1Email", "a@b@example.com")).toBe(true);
  });

  it("un número en el nombre se marca; una tilde o un apóstrofe no", () => {
    expect(esCaracterImposible("nombre", "Milagros 2")).toBe(true);
    expect(esCaracterImposible("apellido", "O'Brien")).toBe(false);
    expect(esCaracterImposible("tutor1Nombre", "María José")).toBe(false);
  });

  it("los campos sin set de caracteres nunca se adelantan a la tecla", () => {
    // Las fechas y el texto libre solo se validan al salir del campo: no hay
    // carácter que sea imposible a mitad de camino.
    expect(esCaracterImposible("fechaNacimiento", "12/05/201")).toBe(false);
    expect(esCaracterImposible("alergiasSalud", "Alergia al maní (#2)")).toBe(false);
  });
});

describe("avisoDelCampo", () => {
  it("un pasaporte vencido avisa, pero no es un error que bloquee", () => {
    expect(avisoDelCampo("fechaVencimientoPasaporte", "2020-01-01", HOY)).toBe(
      AVISO_PASAPORTE_VENCIDO
    );
    expect(
      validarCampoInscripcion("fechaVencimientoPasaporte", "2020-01-01")
    ).toBeUndefined();
  });

  it("un pasaporte vigente no avisa nada", () => {
    expect(avisoDelCampo("fechaVencimientoPasaporte", "2031-08-30", HOY)).toBeUndefined();
    expect(avisoDelCampo("fechaVencimientoPasaporte", "2026-09-18", HOY)).toBeUndefined();
  });

  it("una fecha inválida no genera aviso: eso ya lo dice el error", () => {
    expect(avisoDelCampo("fechaVencimientoPasaporte", "", HOY)).toBeUndefined();
    expect(avisoDelCampo("fechaVencimientoPasaporte", "2026-02-31", HOY)).toBeUndefined();
  });

  it("ningún otro campo tiene avisos hoy", () => {
    expect(avisoDelCampo("fechaNacimiento", "2009-04-12", HOY)).toBeUndefined();
    expect(avisoDelCampo("dni", "45102338", HOY)).toBeUndefined();
  });
});

describe("CAMPOS_EN_VIVO — el contrato con el formulario", () => {
  it("el honeypot y el consentimiento quedan afuera", () => {
    // Marcar `website` le enseñaría al bot qué lo delata; marcar `acepta` en
    // vivo pintaría el consentimiento en rojo apenas se tabula fuera.
    expect(esCampoEnVivo("website")).toBe(false);
    expect(esCampoEnVivo("acepta")).toBe(false);
    expect(esCampoEnVivo("token")).toBe(false);
  });

  it("cubre todos los demás campos del schema", () => {
    const delSchema = Object.keys(inscripcionSchema.shape)
      .filter((campo) => campo !== "website" && campo !== "acepta")
      .sort();
    expect([...CAMPOS_EN_VIVO].sort()).toEqual(delSchema);
  });

  it("un valor válido de cada campo no marca error", () => {
    for (const campo of CAMPOS_EN_VIVO) {
      const valor = VALIDOS[campo];
      expect(valor, `falta un valor válido de prueba para ${campo}`).toBeDefined();
      expect(validarCampoInscripcion(campo, valor ?? ""), campo).toBeUndefined();
    }
  });
});
