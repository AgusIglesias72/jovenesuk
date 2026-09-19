import { Body, Head, Html, Img, Preview } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

import { EMAIL, PHONE_DISPLAY, whatsappConMensaje } from "@/lib/contact";

import {
  ICONOS_MAIL,
  LOGO_MAIL,
  urlDeImagen,
  type IconoMail,
  type ImagenMail,
} from "../imagenes";

/*
 * El marco de los mails que recibe una FAMILIA (la invitación al Application
 * Form y el acuse de la ficha). Los internos siguen con `_layout.tsx`.
 *
 * Reglas del correo, que no son las de la web (detalle en
 * `docs/design-system.md` §Mails):
 *  - todo en tablas de ancho fijo con estilos inline: Outlook de escritorio
 *    dibuja con el motor de Word y no entiende flex, grid ni max-width en divs;
 *  - colores en HEX: ningún cliente lee las variables CSS de `tokens.css`. La
 *    paleta de abajo es la copia de sus valores de `:root`;
 *  - tipografía de sistema: las fuentes web no cargan en Gmail ni en Outlook;
 *  - imágenes con URL absoluta, alt, width y height, y NADA que haga falta leer
 *    dentro de una foto: con las imágenes bloqueadas el mail se entiende igual;
 *  - modo oscuro: se declara solo el esquema claro. Apple Mail lo respeta y no
 *    invierte; Gmail y Outlook invierten igual, y para que su inversión quede
 *    legible cada bloque declara su fondo y su color de texto (nada hereda un
 *    fondo transparente) y el logo viene aplanado sobre blanco.
 */

/** Espejo en HEX de `src/styles/tokens.css` (:root). */
export const PALETA = {
  brand: "#1f6f63",
  brand700: "#2a8576",
  brand100: "#dcf2ec",
  brand50: "#eef9f5",
  accent: "#ff8a5b",
  accent600: "#f5713e",
  accentSoft: "#ffe8dc",
  // El naranja de marca sirve para fondos y el botón, no para texto chico: a
  // 12px sobre blanco daba 2,87:1. Este tono mantiene la familia y llega a 5,2:1.
  accentTexto: "#b84a1a",
  onAccent: "#5a2410",
  page: "#fbf7f2",
  surface: "#ffffff",
  surface3: "#faf3ea",
  ink: "#21302d",
  inkMuted: "#5e6b67",
  // El pie lleva el motivo del mail y el link de baja, que TIENEN que poder leerse:
  // el #94a09b del sistema daba 2,54:1 sobre el fondo de página. Este llega a 4,63:1.
  inkSubtle: "#667370",
  onBrand: "#f4faf7",
  border: "#ece2d6",
} as const;

const FUENTE =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FUENTE_MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace";

/**
 * Las pocas reglas que no pueden ir inline: achicar márgenes y títulos en el
 * teléfono. Gmail, Apple Mail y Outlook del teléfono respetan el media query;
 * el que no, ve el mail de escritorio, que a 600 px igual se lee.
 */
const ESTILOS_HEAD = `
:root { color-scheme: light; supported-color-schemes: light; }
body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
a { color: ${PALETA.brand}; }
@media only screen and (max-width: 620px) {
  .m-pad { padding-left: 20px !important; padding-right: 20px !important; }
  .m-h1 { font-size: 26px !important; line-height: 32px !important; }
  .m-boton a { display: block !important; }
  .m-codigo { font-size: 26px !important; }
}
`;

/** Atributos de una tabla de maquetación: sin bordes ni espacios fantasma. */
const TABLA = {
  role: "presentation",
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
} as const;

type MarcoFamiliaProps = {
  /** El texto que el cliente muestra al lado del asunto, antes de abrir. */
  preview: string;
  foto: ImagenMail;
  children: ReactNode;
  /** Por qué le llega este mail. Va en el pie, en letra chica. */
  motivo: string;
  /** El link de baja; los mails transaccionales (el acuse) no lo llevan. */
  bajaUrl?: string;
};

export function MarcoFamilia({ preview, foto, children, motivo, bajaUrl }: MarcoFamiliaProps) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <style>{ESTILOS_HEAD}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: PALETA.page, fontFamily: FUENTE }}>
        <table {...TABLA} width="100%" style={{ backgroundColor: PALETA.page }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px 32px" }}>
                <table
                  {...TABLA}
                  width="600"
                  align="center"
                  style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}
                >
                  <tbody>
                    <tr>
                      <td>
                        <Tarjeta foto={foto}>{children}</Tarjeta>
                        <Pie motivo={motivo} bajaUrl={bajaUrl} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

function Tarjeta({ foto, children }: { foto: ImagenMail; children: ReactNode }) {
  return (
    <table
      {...TABLA}
      width="100%"
      style={{
        backgroundColor: PALETA.surface,
        borderRadius: "16px",
        border: `1px solid ${PALETA.border}`,
        overflow: "hidden",
      }}
    >
      <tbody>
        <tr>
          <td className="m-pad" style={{ padding: "20px 32px", backgroundColor: PALETA.surface }}>
            <Encabezado />
          </td>
        </tr>
        <tr>
          <td style={{ backgroundColor: PALETA.surface3, lineHeight: 0, fontSize: 0 }}>
            <Img
              src={urlDeImagen(foto.src)}
              alt={foto.alt}
              width={foto.width}
              height={foto.height}
              style={{
                display: "block",
                width: "100%",
                maxWidth: `${foto.width}px`,
                height: "auto",
                border: 0,
                outline: "none",
                color: PALETA.inkMuted,
                fontSize: "13px",
              }}
            />
          </td>
        </tr>
        <tr>
          <td
            className="m-pad"
            style={{ padding: "32px 32px 36px", backgroundColor: PALETA.surface, color: PALETA.ink }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Encabezado() {
  return (
    <table {...TABLA}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "middle", paddingRight: "12px" }}>
            <Img
              src={urlDeImagen(LOGO_MAIL.src)}
              alt={LOGO_MAIL.alt}
              width={LOGO_MAIL.width}
              height={LOGO_MAIL.height}
              style={{ display: "block", border: 0 }}
            />
          </td>
          <td style={{ verticalAlign: "middle" }}>
            <p style={{ margin: 0, fontSize: "17px", lineHeight: "22px", fontWeight: 800, color: PALETA.ink }}>
              Jóvenes en UK
            </p>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "18px", color: PALETA.inkMuted }}>
              Viajes de estudio a países de habla inglesa
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Pie({ motivo, bajaUrl }: { motivo: string; bajaUrl?: string }) {
  const texto: CSSProperties = {
    margin: "0 0 8px",
    fontSize: "12px",
    lineHeight: "18px",
    color: PALETA.inkMuted,
  };
  const link: CSSProperties = { color: PALETA.inkMuted, textDecoration: "underline" };

  return (
    <table {...TABLA} width="100%">
      <tbody>
        <tr>
          <td align="center" style={{ padding: "24px 24px 0", backgroundColor: PALETA.page }}>
            <p style={{ ...texto, fontWeight: 700, color: PALETA.ink }}>Jóvenes en UK</p>
            <p style={texto}>
              <a href={`mailto:${EMAIL}`} style={link}>
                {EMAIL}
              </a>
              {" · "}
              <a href={whatsappConMensaje("Hola, tengo una consulta")} style={link}>
                WhatsApp {PHONE_DISPLAY}
              </a>
              {" · "}
              <a href="https://www.jovenesenuk.com" style={link}>
                jovenesenuk.com
              </a>
            </p>
            <p style={{ ...texto, color: PALETA.inkSubtle }}>
              {motivo}
              {bajaUrl ? (
                <>
                  {" "}
                  <a href={bajaUrl} style={link}>
                    Si no querés recibir más correos, date de baja
                  </a>
                  .
                </>
              ) : null}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ============================================================
   Piezas del cuerpo
   ============================================================ */

/** La línea chica en mayúsculas arriba del título: dice qué es el mail. */
export function Volanta({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        fontSize: "12px",
        lineHeight: "16px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: PALETA.accentTexto,
      }}
    >
      {children}
    </p>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1
      className="m-h1"
      style={{
        margin: "0 0 16px",
        fontSize: "30px",
        lineHeight: "36px",
        fontWeight: 800,
        letterSpacing: "-0.01em",
        color: PALETA.ink,
        fontFamily: FUENTE,
      }}
    >
      {children}
    </h1>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: "32px 0 14px",
        fontSize: "18px",
        lineHeight: "24px",
        fontWeight: 800,
        color: PALETA.ink,
        fontFamily: FUENTE,
      }}
    >
      {children}
    </h2>
  );
}

export function Parrafo({ children, chico = false }: { children: ReactNode; chico?: boolean }) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        fontSize: chico ? "14px" : "16px",
        lineHeight: chico ? "21px" : "25px",
        color: chico ? PALETA.inkMuted : PALETA.ink,
      }}
    >
      {children}
    </p>
  );
}

function Icono({ icono, tamanio = 40 }: { icono: IconoMail; tamanio?: number }) {
  // alt vacío a propósito: el ícono acompaña, no informa. Con las imágenes
  // bloqueadas desaparece y el texto de al lado dice lo mismo.
  return (
    <Img
      src={urlDeImagen(ICONOS_MAIL[icono])}
      alt=""
      width={tamanio}
      height={tamanio}
      style={{ display: "block", border: 0 }}
    />
  );
}

/**
 * El botón "a prueba de balas": el color va en la celda, no en el link.
 * Outlook de escritorio ignora el padding y el border-radius de un `<a>`, pero
 * pinta el fondo de la celda y respeta `mso-padding-alt`; el resto de los
 * clientes toma el padding del link, que así es clickeable en toda su superficie.
 */
export function BotonPrincipal({ href, children }: { href: string; children: ReactNode }) {
  const celda = {
    backgroundColor: PALETA.brand,
    borderRadius: "12px",
    msoPaddingAlt: "18px 36px",
  } as CSSProperties;

  return (
    <table {...TABLA} width="100%" style={{ margin: "8px 0 12px" }}>
      <tbody>
        <tr>
          <td align="center">
            <table {...TABLA} className="m-boton">
              <tbody>
                <tr>
                  <td align="center" style={celda}>
                    <a
                      href={href}
                      target="_blank"
                      style={{
                        display: "inline-block",
                        padding: "18px 36px",
                        fontFamily: FUENTE,
                        fontSize: "18px",
                        lineHeight: "22px",
                        fontWeight: 800,
                        color: "#ffffff",
                        textDecoration: "none",
                        borderRadius: "12px",
                      }}
                    >
                      {children}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** La línea chica centrada debajo del botón ("se completa en 10 minutos"). */
export function NotaDelBoton({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 24px",
        textAlign: "center",
        fontSize: "14px",
        lineHeight: "20px",
        color: PALETA.inkMuted,
      }}
    >
      {children}
    </p>
  );
}

type ViajeDeLaTarjeta = {
  nombre: string;
  codigo?: string | null;
  fechas?: string | null;
  bandera?: ImagenMail | null;
};

/** El viaje, en una tarjeta: es lo primero que la familia tiene que reconocer. */
export function TarjetaViaje({ viaje }: { viaje: ViajeDeLaTarjeta }) {
  return (
    <table
      {...TABLA}
      width="100%"
      style={{
        margin: "4px 0 24px",
        backgroundColor: PALETA.brand50,
        border: `1px solid ${PALETA.brand100}`,
        borderRadius: "12px",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 20px", backgroundColor: PALETA.brand50 }}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "12px",
                lineHeight: "16px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: PALETA.brand,
              }}
            >
              Tu viaje
            </p>
            <table {...TABLA}>
              <tbody>
                <tr>
                  {viaje.bandera ? (
                    <td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
                      <Img
                        src={urlDeImagen(viaje.bandera.src)}
                        alt={viaje.bandera.alt}
                        width={viaje.bandera.width}
                        height={viaje.bandera.height}
                        style={{ display: "block", border: `1px solid ${PALETA.border}` }}
                      />
                    </td>
                  ) : null}
                  <td style={{ verticalAlign: "middle" }}>
                    <p style={{ margin: 0, fontSize: "18px", lineHeight: "24px", fontWeight: 800, color: PALETA.ink }}>
                      {viaje.nombre}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            {viaje.fechas || viaje.codigo ? (
              <p style={{ margin: "6px 0 0", fontSize: "14px", lineHeight: "20px", color: PALETA.inkMuted }}>
                {viaje.fechas ? viaje.fechas : null}
                {viaje.fechas && viaje.codigo ? " · " : null}
                {viaje.codigo ? (
                  <span style={{ fontFamily: FUENTE_MONO, fontSize: "13px" }}>{viaje.codigo}</span>
                ) : null}
              </p>
            ) : null}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Un aviso destacado con ícono (el plazo del link, la privacidad). */
export function Aviso({
  icono,
  tono = "accent",
  children,
}: {
  icono: IconoMail;
  tono?: "accent" | "neutro";
  children: ReactNode;
}) {
  const fondo = tono === "accent" ? PALETA.accentSoft : PALETA.surface3;
  const tinta = tono === "accent" ? PALETA.onAccent : PALETA.ink;

  return (
    <table
      {...TABLA}
      width="100%"
      style={{ margin: "0 0 16px", backgroundColor: fondo, borderRadius: "12px" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "16px 0 16px 16px",
              verticalAlign: "top",
              width: "40px",
              backgroundColor: fondo,
              borderRadius: "12px 0 0 12px",
            }}
          >
            <Icono icono={icono} />
          </td>
          <td
            style={{
              padding: "16px 20px 16px 14px",
              verticalAlign: "middle",
              backgroundColor: fondo,
              borderRadius: "0 12px 12px 0",
              color: tinta,
              fontSize: "15px",
              lineHeight: "22px",
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export type ItemConIcono = { icono: IconoMail; titulo: string; texto: string };

/** Una lista de renglones con ícono, título y bajada ("qué tener a mano"). */
export function ListaConIconos({ items }: { items: readonly ItemConIcono[] }) {
  return (
    <table {...TABLA} width="100%">
      <tbody>
        {items.map((item) => (
          <tr key={item.titulo}>
            <td style={{ padding: "0 14px 16px 0", verticalAlign: "top", width: "40px" }}>
              <Icono icono={item.icono} />
            </td>
            <td style={{ padding: "0 0 16px", verticalAlign: "top" }}>
              <p style={{ margin: "2px 0 2px", fontSize: "15px", lineHeight: "21px", fontWeight: 700, color: PALETA.ink }}>
                {item.titulo}
              </p>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "21px", color: PALETA.inkMuted }}>
                {item.texto}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type Paso = { titulo: string; texto: string; hecho?: boolean };

/**
 * Los pasos numerados de "cómo sigue". El número es texto dentro de una celda
 * con fondo (no una imagen): se ve aunque el cliente bloquee las imágenes.
 */
export function Pasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <table {...TABLA} width="100%">
      <tbody>
        {pasos.map((paso, i) => (
          <tr key={paso.titulo}>
            <td style={{ padding: "0 14px 16px 0", verticalAlign: "top", width: "32px" }}>
              <table {...TABLA}>
                <tbody>
                  <tr>
                    <td
                      align="center"
                      width="32"
                      height="32"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "16px",
                        backgroundColor: paso.hecho ? PALETA.brand : PALETA.brand100,
                        color: paso.hecho ? "#ffffff" : PALETA.brand,
                        fontSize: "15px",
                        lineHeight: "32px",
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      {paso.hecho ? "✓" : String(i + 1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ padding: "0 0 16px", verticalAlign: "top" }}>
              <p style={{ margin: "5px 0 2px", fontSize: "15px", lineHeight: "21px", fontWeight: 700, color: PALETA.ink }}>
                {paso.titulo}
              </p>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "21px", color: PALETA.inkMuted }}>
                {paso.texto}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** El código de referencia en grande, para poder dictarlo por teléfono. */
export function CodigoDestacado({ codigo, children }: { codigo: string; children: ReactNode }) {
  return (
    <table
      {...TABLA}
      width="100%"
      style={{
        margin: "8px 0 24px",
        backgroundColor: PALETA.surface3,
        border: `1px dashed ${PALETA.accent}`,
        borderRadius: "12px",
      }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ padding: "20px 20px 18px", backgroundColor: PALETA.surface3 }}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: "12px",
                lineHeight: "16px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: PALETA.inkMuted,
              }}
            >
              Tu código de referencia
            </p>
            <p
              className="m-codigo"
              style={{
                margin: "0 0 8px",
                fontFamily: FUENTE_MONO,
                fontSize: "30px",
                lineHeight: "36px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: PALETA.brand,
              }}
            >
              {codigo}
            </p>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "20px", color: PALETA.inkMuted }}>
              {children}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** El ícono grande de "listo" arriba del título del acuse. */
export function SelloListo() {
  return (
    <table {...TABLA} style={{ margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td>
            <Icono icono="listo" tamanio={56} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Cómo pedir ayuda, igual en los dos mails. Responder el mail va primero porque
 * sale desde info@ y lo lee una persona; WhatsApp es el canal que las familias
 * ya usan con el equipo.
 */
export function Ayuda({ asuntoWhatsapp }: { asuntoWhatsapp: string }) {
  return (
    <Aviso icono="mensaje" tono="neutro">
      <strong>¿Alguna duda?</strong> Respondé este mail, que lo lee alguien del equipo, o escribinos
      por{" "}
      <a href={whatsappConMensaje(asuntoWhatsapp)} style={{ color: PALETA.brand, fontWeight: 700 }}>
        WhatsApp al {PHONE_DISPLAY}
      </a>
      .
    </Aviso>
  );
}

export function Firma() {
  return (
    <p style={{ margin: "24px 0 0", fontSize: "16px", lineHeight: "24px", color: PALETA.ink }}>
      ¡Nos vemos pronto!
      <br />
      <strong>El equipo de Jóvenes en UK</strong>
    </p>
  );
}
