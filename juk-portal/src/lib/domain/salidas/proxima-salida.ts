/*
 * Salidas grupales que anuncia el sitio público (regla publicada en /salidas:
 * dos por año, febrero y julio, a Cambridge o Londres).
 *
 * La fuente es este calendario mantenido a mano y no la tabla `viajes`: la
 * landing es estática (prerender + revalidación diaria) y `viajes` no tiene
 * una marca de "publicado en la web", así que inferir qué viaje mostrar sería
 * inventar una regla comercial. Cuando el calendario se agota, `proximaSalida`
 * devuelve null y el banner desaparece en lugar de anunciar una fecha vencida.
 */

export type SalidaGrupal = {
  anio: number;
  /** 1 = enero … 12 = diciembre. */
  mes: number;
  destino: string;
};

const DESTINO_GRUPAL = "Cambridge o Londres";

export const SALIDAS_GRUPALES: readonly SalidaGrupal[] = [
  { anio: 2026, mes: 7, destino: "Londres" },
  { anio: 2027, mes: 2, destino: DESTINO_GRUPAL },
  { anio: 2027, mes: 7, destino: DESTINO_GRUPAL },
  { anio: 2028, mes: 2, destino: DESTINO_GRUPAL },
  { anio: 2028, mes: 7, destino: DESTINO_GRUPAL },
];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function orden(anio: number, mes: number): number {
  return anio * 12 + mes;
}

/**
 * La primera salida cuyo mes todavía no terminó. Una salida sigue siendo "la
 * próxima" durante todo su mes: el 15/07 el grupo de julio está por salir o
 * recién salió, y recién el 01/08 el banner pasa a la siguiente.
 */
export function proximaSalida(salidas: readonly SalidaGrupal[], hoy: Date): SalidaGrupal | null {
  const actual = orden(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1);
  let proxima: SalidaGrupal | null = null;
  for (const s of salidas) {
    const o = orden(s.anio, s.mes);
    if (o < actual) continue;
    if (!proxima || o < orden(proxima.anio, proxima.mes)) proxima = s;
  }
  return proxima;
}

/** "Febrero 2027". */
export function etiquetaMesSalida(s: SalidaGrupal): string {
  const mes = MESES[s.mes - 1];
  return mes ? `${mes} ${s.anio}` : String(s.anio);
}
