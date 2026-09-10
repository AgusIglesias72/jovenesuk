import { GRUPOS_PASO, grupoDePaso, type GrupoPaso, type PasoCodigo } from "./codigos";

/**
 * Copy del tablero del alumno de cara a las FAMILIAS (PRD 04 · Módulo 1).
 *
 * El back-office usa `PASO_LABELS`/`GRUPO_LABELS` con nombres técnicos
 * ("Immigration Letter", "Origen"); los padres necesitan saber QUÉ es cada
 * trámite y QUIÉN lo mueve, en criollo. Vive en el dominio (no en el JSX) para
 * que el portal, los mails a familias y los tests hablen igual.
 */

export type ResponsablePaso = "familia" | "juk" | "colegio";

export const RESPONSABLE_LABELS: Record<ResponsablePaso, string> = {
  familia: "Lo hacés vos",
  juk: "Lo hacemos nosotros",
  colegio: "Lo gestiona el colegio",
};

export type AyudaPaso = {
  /** Una línea: qué es el trámite y qué hay que hacer, sin jerga. */
  que: string;
  responsable: ResponsablePaso;
};

export const PASO_AYUDA_FAMILIA: Record<PasoCodigo, AyudaPaso> = {
  paso_0: {
    que: "El formulario de inscripción que completaste con nosotros al arrancar. Queda acá como referencia.",
    responsable: "familia",
  },
  a1: {
    que: "El formulario de inscripción del colegio en el Reino Unido. Lo completás, lo firmás y nos subís una foto o el PDF.",
    responsable: "familia",
  },
  a2: {
    que: "Una prueba corta de inglés para que el colegio arme los grupos por nivel.",
    responsable: "colegio",
  },
  a3: {
    que: "El permiso firmado por los padres para que el colegio pueda cuidar a un alumno menor de edad. Se firma a mano y se sube una foto o escaneo.",
    responsable: "familia",
  },
  b1: {
    que: "El plan de cuotas del viaje. Registramos cada pago que recibimos; el detalle lo ves en Pagos.",
    responsable: "juk",
  },
  b2: {
    que: "El último pago, que se hace en persona. Lo marcamos nosotros cuando lo recibimos.",
    responsable: "juk",
  },
  c1: {
    que: "El permiso electrónico para entrar al Reino Unido. Se pide desde la app oficial del gobierno británico y después nos contás cómo va.",
    responsable: "familia",
  },
  c2: {
    que: "La carta del colegio que confirma la inscripción, para mostrar en migraciones. La subimos nosotros cuando el colegio la emite.",
    responsable: "juk",
  },
  c3: {
    que: "La carta con los datos de la casa donde se va a alojar. La subimos nosotros cuando el colegio confirma el alojamiento.",
    responsable: "juk",
  },
  d1: {
    que: "La autorización para que un menor viaje fuera del país, firmada ante escribano. La tramitás vos y nos confirmás acá cuando la tengas.",
    responsable: "familia",
  },
  d2: {
    que: "El certificado médico que pide el programa. Lo pedís a tu médico y nos subís una foto o el PDF.",
    responsable: "familia",
  },
};

/** Nombre del trámite para familias (traduce los nombres en inglés del tablero). */
export const PASO_LABELS_FAMILIA: Record<PasoCodigo, string> = {
  paso_0: "Inscripción en JUK",
  a1: "Formulario del colegio",
  a2: "Test de nivel de inglés",
  a3: "Permiso de los padres (Parental Consent)",
  b1: "Plan de cuotas",
  b2: "Último pago presencial",
  c1: "Permiso de entrada al Reino Unido (ETA)",
  c2: "Carta del colegio para migraciones",
  c3: "Carta de alojamiento",
  d1: "Autorización de viaje ante escribano",
  d2: "Certificado médico (psicofísico)",
};

export const GRUPO_LABELS_FAMILIA: Record<GrupoPaso, { titulo: string; bajada: string }> = {
  referencia: {
    titulo: "Tu inscripción en JUK",
    bajada: "Lo que ya completaste con nosotros.",
  },
  a: {
    titulo: "Inscripción en el colegio",
    bajada: "Los papeles que pide el colegio para recibir al alumno.",
  },
  b: {
    titulo: "Pagos",
    bajada: "El avance del plan de cuotas.",
  },
  c: {
    titulo: "Documentación para viajar",
    bajada: "El permiso de entrada y las cartas que lleva el alumno.",
  },
  d: {
    titulo: "Trámites en Argentina",
    bajada: "Lo que se gestiona acá antes de salir.",
  },
};

/** Identificador visible del trámite, como lo muestra el tablero: "A1", "C2", "Paso 0". */
export function codigoVisible(codigo: PasoCodigo): string {
  return codigo === "paso_0" ? "Paso 0" : codigo.toUpperCase();
}

/**
 * Agrupa elementos que tengan un código de paso en los grupos del tablero, en
 * el orden canónico (referencia, A, B, C, D) y sin grupos vacíos. Conserva el
 * orden relativo de los elementos dentro de cada grupo.
 */
export function agruparPorGrupoPaso<T extends { codigo: string }>(
  items: readonly T[]
): { grupo: GrupoPaso; items: T[] }[] {
  const porGrupo = new Map<GrupoPaso, T[]>();
  for (const item of items) {
    if (!esPasoCodigo(item.codigo)) continue;
    const grupo = grupoDePaso(item.codigo);
    const lista = porGrupo.get(grupo);
    if (lista) lista.push(item);
    else porGrupo.set(grupo, [item]);
  }
  return GRUPOS_PASO.flatMap((grupo) => {
    const lista = porGrupo.get(grupo);
    return lista ? [{ grupo, items: lista }] : [];
  });
}

const CODIGOS_CONOCIDOS: ReadonlySet<string> = new Set<string>(
  Object.keys(PASO_AYUDA_FAMILIA)
);

export function esPasoCodigo(valor: string): valor is PasoCodigo {
  return CODIGOS_CONOCIDOS.has(valor);
}
