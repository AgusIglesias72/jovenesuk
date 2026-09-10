import type { CSSProperties } from "react";

/**
 * Geometría de los popovers que Select y DateInput montan en un portal sobre
 * document.body (para que no los recorte ningún contenedor con overflow).
 *
 * Es lógica pura y testeable: recibe el rect del disparador y el viewport, y
 * devuelve el anclaje + las clases de Tailwind. El componente solo pasa los
 * números medidos como custom properties.
 */

export type RectDisparador = {
  top: number;
  bottom: number;
  left: number;
  width: number;
};

export type Viewport = { width: number; height: number };

export type AnclajeVertical = "abajo" | "arriba";
export type AnclajeHorizontal = "izquierda" | "derecha";

export type PosicionPopover = {
  vertical: AnclajeVertical;
  horizontal: AnclajeHorizontal;
  /** px desde el borde superior (vertical "abajo") o inferior ("arriba") del viewport */
  desplazamientoY: number;
  left: number;
  ancho: number;
  maxAlto: number;
};

export type OpcionesPopover = {
  /** Ancho fijo del panel; por defecto copia el ancho del disparador. */
  ancho?: number;
  /** Alto que el panel querría ocupar: define hacia dónde conviene abrirlo. */
  altoDeseado?: number;
  /** Separación entre el disparador y el panel. */
  gap?: number;
  /** Margen mínimo contra los bordes del viewport. */
  margen?: number;
};

const ALTO_MINIMO = 160;

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

export function posicionarPopover(
  rect: RectDisparador,
  viewport: Viewport,
  opciones: OpcionesPopover = {}
): PosicionPopover {
  const gap = opciones.gap ?? 8;
  const margen = opciones.margen ?? 16;
  const altoDeseado = opciones.altoDeseado ?? 320;

  const espacioAbajo = viewport.height - rect.bottom - gap - margen;
  const espacioArriba = rect.top - gap - margen;
  const vertical: AnclajeVertical =
    espacioAbajo >= altoDeseado || espacioAbajo >= espacioArriba ? "abajo" : "arriba";

  const ancho = acotar(opciones.ancho ?? rect.width, 0, viewport.width - margen * 2);
  const left = acotar(rect.left, margen, viewport.width - margen - ancho);

  return {
    vertical,
    horizontal: left < rect.left ? "derecha" : "izquierda",
    desplazamientoY:
      vertical === "abajo" ? rect.bottom + gap : viewport.height - rect.top + gap,
    left,
    ancho,
    maxAlto: Math.max(vertical === "abajo" ? espacioAbajo : espacioArriba, ALTO_MINIMO),
  };
}

/**
 * Clases de posicionamiento del panel. Los valores medidos viajan como custom
 * properties (`varsPopover`) porque son geometría del runtime, no decisiones de
 * diseño: así el estilo sigue viviendo en clases y los tokens no se duplican.
 */
export function clasesPopover(pos: PosicionPopover): string {
  return [
    "fixed z-50 left-[var(--pop-x)] w-[var(--pop-w)] max-w-[calc(100vw-2rem)] max-h-[var(--pop-h)]",
    pos.vertical === "abajo" ? "top-[var(--pop-y)]" : "bottom-[var(--pop-y)]",
  ].join(" ");
}

export function varsPopover(pos: PosicionPopover): CSSProperties {
  return {
    "--pop-x": `${pos.left}px`,
    "--pop-y": `${pos.desplazamientoY}px`,
    "--pop-w": `${pos.ancho}px`,
    "--pop-h": `${pos.maxAlto}px`,
  } as CSSProperties;
}

export function medirPopover(
  disparador: HTMLElement,
  opciones: OpcionesPopover = {}
): PosicionPopover {
  const rect = disparador.getBoundingClientRect();
  return posicionarPopover(
    { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
    { width: window.innerWidth, height: window.innerHeight },
    opciones
  );
}
