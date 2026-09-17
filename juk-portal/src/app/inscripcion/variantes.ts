import type { Variante } from "@/lib/domain/inscripciones/schema";

/**
 * Presentación de cada variante del Application Form.
 *
 * Las tres comparten el formulario entero: los mismos campos, el mismo orden,
 * la misma server action y el mismo árbol accesible. Lo que cambia es la piel
 * (en `src/styles/form-variants.css`) y estos pocos datos de presentación, que
 * deciden CÓMO se anuncia una sección y qué adornos se dibujan.
 *
 * Nada de esto viaja al server ni decide nada: la variante que se registra con
 * la ficha es el string `a | b | c`, no lo de acá.
 */

/**
 * Clase de la piel, escrita COMPLETA como literal. El JIT de Tailwind y el CSS
 * leen texto plano: una clase armada por interpolación no existiría en el
 * bundle final. La aplica la page sobre el contenedor de la pantalla, nunca el
 * formulario (ver el comentario de `layout.tsx`).
 */
export const VARIANTE_CLASES: Record<Variante, string> = {
  a: "v-form-a",
  b: "v-form-b",
  c: "v-form-c",
};

/**
 * Piel del shell mientras todavía no hay marca de variante: la del skeleton de
 * `loading.tsx`, que se pinta antes de resolver el token. Vale la piel A —que
 * es la base y el default— y se apaga sola en cuanto el árbol trae la marca de
 * otra variante. La aplica el layout; el detalle, en `form-variants.css`.
 */
export const VARIANTE_CLASE_BASE = "v-form-base";

/** Cómo se anuncia el orden de cada sección. El texto es decorativo (aria-hidden). */
export type RotuloSeccion = "numero" | "volanta" | "parada";

export type PresentacionVariante = {
  /** Nombre interno de la identidad, para el back-office y los tests. */
  nombre: string;
  clase: string;
  rotulo: RotuloSeccion;
  /** B: nota de confianza bajo los campos sensibles. */
  microcopy: boolean;
  /** C: barra de progreso arriba y tilde en la parada completa. */
  progreso: boolean;
};

export const PRESENTACION_POR_VARIANTE: Record<Variante, PresentacionVariante> = {
  a: {
    nombre: "Legajo",
    clase: VARIANTE_CLASES.a,
    rotulo: "numero",
    microcopy: false,
    progreso: false,
  },
  b: {
    nombre: "Cuaderno",
    clase: VARIANTE_CLASES.b,
    rotulo: "volanta",
    microcopy: true,
    progreso: false,
  },
  c: {
    nombre: "Embarque",
    clase: VARIANTE_CLASES.c,
    rotulo: "parada",
    microcopy: false,
    progreso: true,
  },
};

/**
 * Texto del orden de una sección. Se pinta en un nodo `aria-hidden`: el nombre
 * accesible del grupo tiene que ser el mismo título en las tres variantes.
 */
export function textoRotulo(rotulo: RotuloSeccion, numero: number, total: number): string {
  switch (rotulo) {
    case "numero":
      return String(numero).padStart(2, "0");
    case "volanta":
      return `Parte ${numero} de ${total}`;
    case "parada":
      return String(numero);
  }
}

/**
 * Microcopy de confianza, por nombre de campo. No es la ayuda del campo (esa
 * explica QUÉ poner y va en `help`, igual en las tres variantes): esto explica
 * para qué le sirve el dato a la familia, y solo lo muestra el Cuaderno.
 */
export const MICROCOPY: Record<string, string> = {
  dni: "Lo usamos para emitir la documentación del viaje. No se comparte con nadie más.",
  fechaVencimientoPasaporte:
    "Tiene que vencer después de que termine el viaje. Si no llega, avisanos y te acompañamos con la renovación.",
  tutor1Celular: "Es el número al que llamamos si pasa algo durante el viaje.",
  tutor1Email: "A esta casilla llega el acceso al Portal de Familias: revisá que esté bien escrita.",
  alergiasSalud: "Lo lee solo el equipo que acompaña al grupo. Contanos todo lo que haga falta.",
};
