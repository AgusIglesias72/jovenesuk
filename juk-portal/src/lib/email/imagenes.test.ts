import { existsSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ICONOS_MAIL,
  LOGO_MAIL,
  banderaDelViaje,
  fotoDelViaje,
  urlDeImagen,
} from "./imagenes";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fotoDelViaje", () => {
  it("elige la foto por el sufijo del código", () => {
    expect(fotoDelViaje({ codigo: "UK-2026-JUL-LONDON" }).src).toBe("/email/viaje-londres.jpg");
    expect(fotoDelViaje({ codigo: "UK-2027-FEB-BRIGHTON" }).src).toBe("/email/viaje-brighton.jpg");
    expect(fotoDelViaje({ codigo: "UK-2026-JUL-EDINBURGH" }).src).toBe("/email/viaje-edimburgo.jpg");
    expect(fotoDelViaje({ codigo: "UK-2026-JUL-OXFORD" }).src).toBe("/email/viaje-oxford.jpg");
  });

  it("sin código, la reconoce en el nombre, en castellano y con tildes o sin ellas", () => {
    expect(fotoDelViaje({ nombre: "Londres en Julio" }).src).toBe("/email/viaje-londres.jpg");
    expect(fotoDelViaje({ nombre: "edimburgo, invierno" }).src).toBe("/email/viaje-edimburgo.jpg");
    expect(fotoDelViaje({ nombre: "Brighton 2027" }).src).toBe("/email/viaje-brighton.jpg");
  });

  it("el código manda sobre el nombre, que es texto libre", () => {
    const foto = fotoDelViaje({ codigo: "UK-2026-JUL-OXFORD", nombre: "Londres y Oxford" });
    expect(foto.src).toBe("/email/viaje-oxford.jpg");
  });

  it("no confunde una palabra que solo contiene la ciudad", () => {
    // "Londonderry" no es Londres: se compara por palabra entera.
    expect(fotoDelViaje({ nombre: "Londonderry" }).src).toBe("/email/viaje-grupo.jpg");
  });

  it("sin ciudad reconocida, o sin viaje, va la del grupo y no una de Londres", () => {
    expect(fotoDelViaje({ codigo: "UK-2026-JUL-CHESTER" }).src).toBe("/email/viaje-grupo.jpg");
    expect(fotoDelViaje({ nombre: "Malta en enero" }).src).toBe("/email/viaje-grupo.jpg");
    expect(fotoDelViaje(null).src).toBe("/email/viaje-grupo.jpg");
    expect(fotoDelViaje(undefined).src).toBe("/email/viaje-grupo.jpg");
  });

  it("siempre trae alt y un tamaño 2:1 a lo ancho del mail", () => {
    const foto = fotoDelViaje({ codigo: "UK-2026-JUL-LONDON" });
    expect(foto.alt).not.toBe("");
    expect(foto.width).toBe(600);
    expect(foto.height).toBe(300);
  });

  it("el alt de la foto de respaldo no nombra una ciudad que no es la del viaje", () => {
    // Con las imágenes bloqueadas, el alt es lo único que ve la familia: a la que
    // viaja a Malta no le puede aparecer "Londres".
    const respaldo = fotoDelViaje({ nombre: "Malta en enero" });
    expect(respaldo.alt).not.toMatch(/londres|london|edimburgo|oxford|brighton/i);
  });
});

describe("banderaDelViaje", () => {
  it("usa el país del viaje", () => {
    expect(banderaDelViaje({ paisDestino: "irlanda" })?.src).toBe("/email/bandera-ie.png");
    expect(banderaDelViaje({ paisDestino: "reino_unido" })?.alt).toBe("Reino Unido");
  });

  it("sin país, un código UK- alcanza para saber que es Reino Unido", () => {
    expect(banderaDelViaje({ codigo: "UK-2026-JUL-LONDON" })?.src).toBe("/email/bandera-gb.png");
  });

  it("sin bandera conocida no inventa una", () => {
    expect(banderaDelViaje({ paisDestino: "otro" })).toBeNull();
    expect(banderaDelViaje({})).toBeNull();
  });

  it("todas con el mismo alto, y cada una con el ancho de su proporción real", () => {
    // La de Malta es 3:2: dibujada a 24×12 (2:1) se veía aplastada.
    const gb = banderaDelViaje({ paisDestino: "reino_unido" });
    const mt = banderaDelViaje({ paisDestino: "malta" });
    expect(gb?.height).toBe(12);
    expect(mt?.height).toBe(12);
    expect(gb?.width).toBe(24);
    expect(mt?.width).toBe(18);
  });
});

describe("urlDeImagen", () => {
  it("arma una URL absoluta sin duplicar la barra", () => {
    expect(urlDeImagen("/email/logo-juk.png", "https://jovenesuk.vercel.app/")).toBe(
      "https://jovenesuk.vercel.app/email/logo-juk.png"
    );
  });

  it("lee el entorno en cada llamada", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.jovenesenuk.com");
    expect(urlDeImagen("/email/logo-juk.png")).toBe("https://staging.jovenesenuk.com/email/logo-juk.png");
  });
});

describe("los archivos existen", () => {
  // Un nombre mal escrito acá no lo ve nadie hasta que un mail sale con un hueco.
  const publico = join(process.cwd(), "public");
  const rutas = [
    LOGO_MAIL.src,
    ...Object.values(ICONOS_MAIL),
    ...["UK-X-LONDON", "UK-X-BRIGHTON", "UK-X-EDINBURGH", "UK-X-OXFORD", "UK-X-OTRA"].map(
      (codigo) => fotoDelViaje({ codigo }).src
    ),
    ...["reino_unido", "irlanda", "canada", "malta", "australia"].map(
      (paisDestino) => banderaDelViaje({ paisDestino })!.src
    ),
  ];

  it.each(rutas)("%s", (ruta) => {
    expect(ruta).toMatch(/\.(png|jpg)$/);
    expect(existsSync(join(publico, ruta))).toBe(true);
  });
});
