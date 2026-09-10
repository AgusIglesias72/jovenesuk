"use client";

import { useEffect } from "react";

/**
 * Bloqueo de scroll del fondo mientras hay un overlay abierto (diálogo, drawer,
 * bottom sheet).
 *
 * `document.body.style.overflow = "hidden"` NO alcanza en iOS: Safari sigue
 * scrolleando el documento con el gesto táctil (scroll-through) y al cerrar el
 * overlay la página quedó en otra posición. El único patrón que funciona es
 * fijar el body (`position: fixed`) desplazado hacia arriba el scroll actual y,
 * al liberar, restaurar los estilos previos y volver con `window.scrollTo`.
 *
 * `overflow-y: scroll` mantiene la barra de scroll en desktop para que la página
 * no salte horizontalmente al bloquear.
 *
 * Uso:
 *   useScrollLock(abierto);
 *
 * Soporta overlays anidados (drawer + confirm): se cuentan los bloqueos activos
 * y sólo el primero fija el body / sólo el último lo restaura.
 */

export type EstilosBloqueo = {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflowY: string;
};

/** Estilos que hay que aplicarle al `<body>` para congelarlo en `scrollY`. */
export function estilosBloqueo(scrollY: number): EstilosBloqueo {
  const y = Number.isFinite(scrollY) ? Math.max(0, Math.round(scrollY)) : 0;
  return {
    position: "fixed",
    top: `-${y}px`,
    left: "0px",
    right: "0px",
    width: "100%",
    overflowY: "scroll",
  };
}

/** Scroll original a partir del `top` negativo que dejó `estilosBloqueo`. */
export function scrollDesdeTop(top: string): number {
  const n = Number.parseFloat(top);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function leerEstilos(style: CSSStyleDeclaration): EstilosBloqueo {
  return {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflowY: style.overflowY,
  };
}

function aplicarEstilos(style: CSSStyleDeclaration, estilos: EstilosBloqueo) {
  style.position = estilos.position;
  style.top = estilos.top;
  style.left = estilos.left;
  style.right = estilos.right;
  style.width = estilos.width;
  style.overflowY = estilos.overflowY;
}

let bloqueosActivos = 0;
let estilosPrevios: EstilosBloqueo | null = null;
let scrollGuardado = 0;

function bloquear() {
  bloqueosActivos += 1;
  if (bloqueosActivos > 1) return;

  estilosPrevios = leerEstilos(document.body.style);
  scrollGuardado = window.scrollY;
  aplicarEstilos(document.body.style, estilosBloqueo(scrollGuardado));
}

function liberar() {
  bloqueosActivos = Math.max(0, bloqueosActivos - 1);
  if (bloqueosActivos > 0 || !estilosPrevios) return;

  aplicarEstilos(document.body.style, estilosPrevios);
  estilosPrevios = null;
  window.scrollTo(0, scrollGuardado);
}

export function useScrollLock(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    bloquear();
    return liberar;
  }, [activo]);
}
