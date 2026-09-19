/*
 * Las imágenes de los mails a las familias: qué foto lleva cada viaje, qué
 * bandera y qué ícono, y la URL absoluta con la que se piden.
 *
 * Todo sale de `public/email/`, una carpeta propia y no `public/landing/`, por
 * dos razones:
 *  - un mail enviado vive para siempre en la casilla: si mañana el sitio
 *    renombra o saca una foto, los mails viejos no pueden quedar con un hueco;
 *  - los clientes de correo no aceptan lo que usa la web. Outlook de escritorio
 *    no muestra WebP y Gmail bloquea SVG, así que acá hay solo JPG y PNG.
 *
 * Origen de cada archivo (generados una vez con sharp desde `public/landing/`):
 *  - viaje-londres.jpg    ← trips/london-westminster.jpg, recortada a 900x450
 *  - viaje-brighton.jpg   ← trips/brighton.jpg, 960x480
 *  - viaje-edimburgo.jpg  ← trips/edinburgh.jpg, 900x450
 *  - viaje-oxford.jpg     ← trips/oxford.webp, pasada a JPG y recortada a 720x360
 *  - viaje-grupo.jpg      ← salida-institutos.webp (un grupo de JUK en Notting
 *                           Hill), pasada a JPG, 1200x600
 *  - logo-juk.png         ← logo-juk.png achicado a 120 px y aplanado sobre
 *                           blanco: el original es transparente y en modo oscuro
 *                           el óvalo quedaba flotando sobre negro
 *  - bandera-*.png        ← flags/*.png, copiadas tal cual
 *  - icono-*.png          ← dibujados con los trazos de Lucide sobre un círculo
 *                           brand-100 (#dcf2ec) con tinta brand (#1f6f63), a
 *                           96 px para verse nítidos a 40 px en pantallas retina
 * Las fotos van en JPG calidad 74 (mozjpeg) y ninguna pasa los 100 KB.
 */

export type ImagenMail = {
  /** Ruta dentro de `public/`, siempre con la barra inicial. */
  src: string;
  alt: string;
  /** Tamaño en el que se muestra (el archivo es más grande, para retina). */
  width: number;
  height: number;
};

/** Las fotos de cabecera se muestran a lo ancho del mail, en proporción 2:1. */
const ANCHO_FOTO = 600;
const ALTO_FOTO = 300;

const FOTOS = {
  londres: { src: "/email/viaje-londres.jpg", alt: "Westminster y el Big Ben, Londres" },
  brighton: { src: "/email/viaje-brighton.jpg", alt: "La costa de Brighton" },
  edimburgo: { src: "/email/viaje-edimburgo.jpg", alt: "Edimburgo, Escocia" },
  oxford: { src: "/email/viaje-oxford.jpg", alt: "La Radcliffe Camera, Oxford" },
  grupo: {
    src: "/email/viaje-grupo.jpg",
    // Sin ciudad: esta foto es la de respaldo para los destinos que no se
    // reconocen (Malta, Chester…). Con las imágenes bloqueadas el alt es lo único
    // que se ve, así que no puede nombrar una ciudad que no es la del viaje.
    alt: "Un grupo de alumnos de Jóvenes en UK de viaje",
  },
} as const;

type ClaveFoto = keyof typeof FOTOS;

/**
 * Qué palabra del viaje elige cada foto. Se buscan en el sufijo del código
 * (UK-2026-JUL-LONDON) y en el nombre ("Londres en Julio"), en inglés y en
 * castellano porque el equipo escribe los nombres de las dos maneras.
 */
const CIUDADES: readonly { palabras: readonly string[]; foto: ClaveFoto }[] = [
  { palabras: ["LONDON", "LONDRES"], foto: "londres" },
  { palabras: ["BRIGHTON"], foto: "brighton" },
  { palabras: ["EDINBURGH", "EDIMBURGO"], foto: "edimburgo" },
  { palabras: ["OXFORD"], foto: "oxford" },
];

export type ViajeParaFoto = {
  codigo?: string | null;
  nombre?: string | null;
};

/** Mayúsculas y sin tildes, partido en palabras: "Edimburgo, julio" → [EDIMBURGO, JULIO]. */
function palabrasDe(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

function fotoPorPalabras(palabras: readonly string[]): ClaveFoto | null {
  for (const ciudad of CIUDADES) {
    if (ciudad.palabras.some((p) => palabras.includes(p))) return ciudad.foto;
  }
  return null;
}

/**
 * La foto de cabecera de un viaje. Los viajes no tienen foto propia en la base,
 * así que se elige una del sitio público por la ciudad.
 *
 * Manda el código sobre el nombre: el sufijo del código lo valida el dominio
 * (UK-AAAA-MMM-CIUDAD) y el nombre es texto libre, donde "Londres y Oxford"
 * podría elegir cualquiera de las dos.
 *
 * Sin ciudad reconocida va la del grupo de alumnos, no el Big Ben: a una
 * familia que viaja a Malta, una foto de Londres le dice que el mail es de otro
 * viaje; una de chicos viajando no le miente.
 */
export function fotoDelViaje(viaje: ViajeParaFoto | null | undefined): ImagenMail {
  const sufijo = palabrasDe(viaje?.codigo).at(-1);
  const clave =
    (sufijo ? fotoPorPalabras([sufijo]) : null) ?? fotoPorPalabras(palabrasDe(viaje?.nombre)) ?? "grupo";

  return { ...FOTOS[clave], width: ANCHO_FOTO, height: ALTO_FOTO };
}

/** Todas las banderas se dibujan con el mismo alto, para que se vean parejas en la fila. */
const ALTO_BANDERA = 12;

/**
 * `ancho` es el que corresponde a su proporción real con `ALTO_BANDERA` de alto:
 * las banderas no son todas 2:1. La de Malta es 3:2 y forzada a 24×12 se veía
 * aplastada (los clientes de correo respetan width/height al pie de la letra).
 */
const BANDERAS: Record<string, { src: string; alt: string; ancho: number }> = {
  reino_unido: { src: "/email/bandera-gb.png", alt: "Reino Unido", ancho: 24 },
  irlanda: { src: "/email/bandera-ie.png", alt: "Irlanda", ancho: 24 },
  canada: { src: "/email/bandera-ca.png", alt: "Canadá", ancho: 24 },
  malta: { src: "/email/bandera-mt.png", alt: "Malta", ancho: 18 },
  australia: { src: "/email/bandera-au.png", alt: "Australia", ancho: 24 },
};

/**
 * La bandera del destino. Va como PNG y no como emoji: Windows no dibuja los
 * emoji de banderas y en Outlook se verían las dos letras sueltas ("GB").
 *
 * Sin país, y como todos los códigos de viaje empiezan con UK, un código
 * válido alcanza para saber que es Reino Unido.
 */
export function banderaDelViaje(viaje: {
  paisDestino?: string | null;
  codigo?: string | null;
}): ImagenMail | null {
  const pais = viaje.paisDestino ?? (viaje.codigo?.startsWith("UK-") ? "reino_unido" : null);
  const bandera = pais ? BANDERAS[pais] : undefined;
  if (!bandera) return null;
  return { src: bandera.src, alt: bandera.alt, width: bandera.ancho, height: ALTO_BANDERA };
}

/**
 * Los íconos de los mails. Son PNG alojados y no emoji ni SVG: el SVG no se ve
 * en Gmail ni en Outlook, y el emoji cambia de dibujo (y de color) según el
 * sistema, así que no puede llevar el color de la marca. Si el cliente bloquea
 * las imágenes, el ícono desaparece sin dejar hueco (alt vacío): todo lo que
 * dice el mail está en el texto de al lado.
 */
export const ICONOS_MAIL = {
  calendario: "/email/icono-calendario.png",
  pasaporte: "/email/icono-pasaporte.png",
  celular: "/email/icono-celular.png",
  salud: "/email/icono-salud.png",
  candado: "/email/icono-candado.png",
  mensaje: "/email/icono-mensaje.png",
  lapiz: "/email/icono-lapiz.png",
  listo: "/email/icono-listo.png",
} as const;

export type IconoMail = keyof typeof ICONOS_MAIL;

export const LOGO_MAIL: ImagenMail = {
  src: "/email/logo-juk.png",
  alt: "Jóvenes en UK",
  width: 60,
  height: 48,
};

/**
 * Sin la variable configurada, las imágenes apuntan a producción y no a
 * localhost. Es la misma base por defecto que el link del formulario
 * (`send-invitacion-inscripcion.tsx`): si el dominio cambia, cambian las dos.
 */
const BASE_POR_DEFECTO = "https://portal.jovenesenuk.com";

/**
 * La URL absoluta de una imagen del mail. Tiene que ser absoluta y pública: el
 * mail se abre fuera del sitio, sin sesión, y los clientes no resuelven rutas
 * relativas. La base se lee en cada llamada (en el build no está) y entra por
 * parámetro para fijarla en el test.
 */
export function urlDeImagen(
  src: string,
  base: string = process.env.NEXT_PUBLIC_APP_URL ?? BASE_POR_DEFECTO
): string {
  return `${base.replace(/\/+$/, "")}${src}`;
}
