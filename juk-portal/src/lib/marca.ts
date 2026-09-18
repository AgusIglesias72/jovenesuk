/*
 * Datos de marca de Jóvenes en UK — fuente única para el sitio público y el
 * Application Form (`/inscripcion`). Mismo criterio que `src/lib/contact.ts`:
 * cuando un dato de marca lo necesitan dos superficies, sube a `src/lib/` en
 * vez de copiarse. `(public)/_sections/` es carpeta privada de ese segmento y
 * `/inscripcion` vive afuera; sin este archivo las cifras y las acreditaciones
 * tendrían dos copias que envejecen por separado.
 */

export type StatMarca = { valor: string; label: string };
export type AcreditacionMarca = { src: string; alt: string };

export const STATS_JUK: readonly StatMarca[] = [
  { valor: "+10", label: "años de trayectoria" },
  { valor: "+1.000", label: "estudiantes capacitados" },
  { valor: "4,9/5", label: "satisfacción post-viaje" },
  { valor: "8", label: "destinos en el mundo" },
] as const;

/**
 * Los ocho sellos que ya se muestran en la home. El `alt` no es decorativo: es
 * el nombre de la entidad, y es lo que un lector de pantalla anuncia como
 * prueba de respaldo. La auditoría de `a11y-basico.spec.ts` (regla d) exige que
 * ninguna imagen quede sin él.
 */
export const ACREDITACIONES_JUK: readonly AcreditacionMarca[] = [
  { src: "/landing/acreditacion-01.png", alt: "English UK — Partner Agency" },
  { src: "/landing/acreditacion-02.jpg", alt: "Quality English — Online Courses" },
  { src: "/landing/acreditacion-03.jpg", alt: "British Council" },
  { src: "/landing/acreditacion-04.jpg", alt: "Trinity College London — Listed Education Agent" },
  { src: "/landing/acreditacion-05.png", alt: "ICEF Accredited Agency" },
  { src: "/landing/acreditacion-06.jpg", alt: "IALC — Approved Agency" },
  { src: "/landing/acreditacion-07.png", alt: "Cambridge English Qualifications — Trained Agent" },
  { src: "/landing/acreditacion-08.jpg", alt: "Quality English — Authorised Agent" },
] as const;

/** La foto de la cabecera del Application Form, con su texto alternativo. */
export const FOTO_HERO_INSCRIPCION = {
  src: "/landing/trips/london-westminster.jpg",
  alt: "Westminster y el Big Ben, Londres",
} as const;
