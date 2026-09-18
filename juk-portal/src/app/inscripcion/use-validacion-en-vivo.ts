"use client";

import { useState } from "react";

import { MENSAJE_FECHA_INVALIDA } from "@/lib/domain/inscripciones/schema";
import {
  avisoDelCampo,
  esCampoEnVivo,
  esCaracterImposible,
  validarCampoInscripcion,
  type CampoEnVivo,
} from "@/lib/domain/inscripciones/validacion-campo";

/**
 * Validación en vivo del Application Form.
 *
 * El hook es SOLO cableado: quién es el campo, cuál es su valor y cuándo se
 * pregunta. Qué está mal y cómo se dice lo decide el dominio
 * (`@/lib/domain/inscripciones/validacion-campo`), que es lo que el server
 * vuelve a aplicar y lo único que se puede unit-testear en este repo (Vitest
 * corre en `environment: "node"`, sin jsdom ni testing-library). Este archivo
 * lo cubre el E2E.
 *
 * EL CRITERIO DE UX, que es de lo que se trata todo esto:
 * - mientras alguien escribe POR PRIMERA VEZ no se le grita: un email a medio
 *   tipear no es un error;
 * - salvo que lo que escribió sea imposible (una letra en el DNI): eso se marca
 *   en el acto, que es el pedido textual del dueño;
 * - una vez marcado, el error se borra apenas el dato queda bien, sin esperar a
 *   salir del campo (premio inmediato);
 * - pero el MENSAJE no se cambia bajo los dedos: si sigue mal mientras escribe,
 *   el texto se recalcula recién al salir del campo. Eso también evita
 *   cualquier debounce y, con él, un timer que limpiar.
 *
 * ES EL MOLDE PARA EL RESTO DE LOS FORMULARIOS (`lead-form.tsx`,
 * `alumno-form.tsx`, `prospecto-form.tsx`), que quedaron fuera del alcance de
 * esta tanda: lo que se copia es la forma (dominio puro + hook delgado), no el
 * archivo.
 */

/**
 * Lo que el hook sabe de cada campo:
 * - `string`: el error que se está mostrando;
 * - `null`: lo validó y está bien;
 * - ausente: todavía no opinó, así que manda lo que haya dicho el server.
 */
type OpinionPorCampo = Record<string, string | null>;

export type ValidacionEnVivo = {
  /** El error a mostrar, combinando lo de acá con lo que devolvió el server. */
  errorDe: (campo: string, delServidor?: string) => string | undefined;
  /** Avisos que no bloquean (hoy: el pasaporte vencido). */
  avisos: Record<string, string>;
  alEscribir: (e: React.FormEvent<HTMLFormElement>) => void;
  alSalir: (e: React.FocusEvent<HTMLFormElement>) => void;
  /** Texto para la región viva del formulario. */
  anuncio: string;
};

/**
 * El campo al que pertenece un control. Las dos fechas obligan a este rodeo: el
 * `name` lo lleva el `<input type="date">` oculto de `<DateInput>` y el input de
 * texto visible —el que la familia enfoca y del que sale el blur— no lo tiene.
 * Por eso cada campo del formulario va envuelto en un `[data-campo]`.
 */
function campoDelEvento(el: EventTarget | null): CampoEnVivo | null {
  if (!(el instanceof HTMLElement)) return null;
  const propio = el.getAttribute("name");
  const nombre = propio || el.closest("[data-campo]")?.getAttribute("data-campo") || "";
  return esCampoEnVivo(nombre) ? nombre : null;
}

function valorVisible(el: EventTarget | null): string {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : "";
}

export function useValidacionEnVivo(etiquetas: Record<string, string>): ValidacionEnVivo {
  const [opinion, setOpinion] = useState<OpinionPorCampo>({});
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [anuncio, setAnuncio] = useState("");

  function registrar(campo: string, mensaje: string | undefined) {
    const anterior = opinion[campo];
    setOpinion((previo) => ({ ...previo, [campo]: mensaje ?? null }));
    // La región viva solo habla cuando algo PASA a estar mal, y no repite el
    // mismo mensaje: con lector de pantalla, anunciar en cada tecla es ruido.
    if (mensaje && mensaje !== anterior) {
      setAnuncio(`${etiquetas[campo] ?? campo}: ${mensaje}`);
    } else if (!mensaje && anterior) {
      setAnuncio("");
    }
  }

  function alEscribir(e: React.FormEvent<HTMLFormElement>) {
    const campo = campoDelEvento(e.target);
    if (!campo) return;
    const escrito = valorVisible(e.target);

    if (esCaracterImposible(campo, escrito)) {
      registrar(campo, validarCampoInscripcion(campo, escrito));
      return;
    }

    // Sin un error a la vista no hay nada que hacer mientras escribe: ni cuando
    // todavía no opinamos del campo, ni cuando ya lo validamos y estaba bien.
    // Si lo que está escribiendo ahora lo rompe, se lo decimos al salir.
    const marcado = opinion[campo];
    if (marcado == null) return;

    // El valor sale del FORM y no del control: en las fechas el valor real vive
    // en el input oculto, y el visible puede estar a medio tipear.
    const delForm = String(new FormData(e.currentTarget).get(campo) ?? "");
    if (!validarCampoInscripcion(campo, delForm)) registrar(campo, undefined);
  }

  function alSalir(e: React.FocusEvent<HTMLFormElement>) {
    const campo = campoDelEvento(e.target);
    if (!campo) return;

    const delForm = String(new FormData(e.currentTarget).get(campo) ?? "");
    let mensaje = validarCampoInscripcion(campo, delForm);

    // Una fecha a medio tipear ("12/05/201") deja el valor del form VACÍO: sin
    // esto el aviso diría "Ingresá la fecha" con el campo lleno a la vista. El
    // control sin `name` propio es, justamente, el input visible de <DateInput>.
    const aMedioTipear =
      mensaje !== undefined &&
      delForm === "" &&
      !(e.target as HTMLElement).getAttribute("name") &&
      valorVisible(e.target).trim() !== "";
    if (aMedioTipear) mensaje = MENSAJE_FECHA_INVALIDA;

    registrar(campo, mensaje);

    const aviso = avisoDelCampo(campo, delForm, new Date()) ?? "";
    setAvisos((previo) => (previo[campo] === aviso ? previo : { ...previo, [campo]: aviso }));
  }

  function errorDe(campo: string, delServidor?: string): string | undefined {
    const propia = opinion[campo];
    // Si acá ya hay una opinión, gana: es la misma regla del server, aplicada
    // sobre lo que hay AHORA en el campo.
    if (propia !== undefined) return propia ?? undefined;
    return delServidor;
  }

  return { errorDe, avisos, alEscribir, alSalir, anuncio };
}
