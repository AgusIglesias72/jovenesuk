import { CUANDO, DESTINO, ESTADO_CONSULTA, MODALIDAD, PARA_QUIEN } from "./schema";

const labelMap = <T extends ReadonlyArray<{ value: string; label: string }>>(opts: T) =>
  Object.fromEntries(opts.map((o) => [o.value, o.label])) as Record<
    T[number]["value"],
    string
  >;

/* ── Etiquetas para el admin (value → label) ─────────────────────────── */

export const PARA_QUIEN_LABELS = labelMap(PARA_QUIEN);
export const MODALIDAD_LABELS = labelMap(MODALIDAD);
export const CUANDO_LABELS = labelMap(CUANDO);
export const DESTINO_LABELS = labelMap(DESTINO);
export const ESTADO_CONSULTA_LABELS = labelMap(ESTADO_CONSULTA);
