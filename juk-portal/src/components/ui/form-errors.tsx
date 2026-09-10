"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FieldErrors } from "@/lib/actions/result";

/**
 * Errores de formulario del design system: estado, foco y anuncio.
 *
 * Los 5 ABMs repetían el mismo trío (useState de fieldErrors, `fe(k)` y un
 * `window.scrollTo({ top: 0 })` que dejaba al usuario buscando el campo roto a
 * ojo). Acá vive una sola vez:
 *
 *  - `fe(campo)` → el primer mensaje del campo, para pasarlo a `<Field error>`.
 *  - `reportar(result.fieldErrors)` cuando la action falla: en el próximo
 *    commit el foco salta al primer control con `aria-invalid="true"` y lo
 *    centra en pantalla (en un teléfono el error suele quedar fuera de vista).
 *    Sin fieldErrors (error general) vuelve al tope, que es donde está el toast.
 *  - `aviso` → texto para `<AvisoErrores>`, la región viva que le dice a un
 *    lector de pantalla qué pasó (el salto de foco solo no lo explica).
 *
 * @example
 *   const { formRef, fe, reportar, limpiar, aviso } = useErroresDeFormulario();
 *   …
 *   if (!result.ok) reportar(result.fieldErrors);
 *   …
 *   <form ref={formRef} onSubmit={enviar}>
 *     <AvisoErrores>{aviso}</AvisoErrores>
 *     <Field label="Nombre" error={fe("nombre")}>…</Field>
 */

/** El nombre visible del control, para nombrarlo en el aviso. */
function nombreDelCampo(control: HTMLElement): string {
  const labelId = control.getAttribute("aria-labelledby");
  const texto = labelId ? document.getElementById(labelId)?.textContent : null;
  return (texto ?? control.getAttribute("aria-label") ?? "").replace("*", "").trim();
}

function contar(errores: FieldErrors): number {
  return Object.values(errores).filter((m) => m && m.length > 0).length;
}

export function useErroresDeFormulario() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errores, setErrores] = useState<FieldErrors>({});
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState("");
  // El efecto corre por `intento`: leer los errores de una ref evita que un
  // `limpiar()` (que no cambia el intento) vuelva a disparar el salto de foco.
  const erroresRef = useRef<FieldErrors>({});

  const reportar = useCallback((nuevos?: FieldErrors) => {
    erroresRef.current = nuevos ?? {};
    setErrores(nuevos ?? {});
    setIntento((n) => n + 1);
  }, []);

  const limpiar = useCallback(() => {
    erroresRef.current = {};
    setErrores({});
    setAviso("");
  }, []);

  useEffect(() => {
    if (intento === 0) return;
    // El DOM ya se re-renderizó con los aria-invalid nuevos: acá el primer
    // control roto existe y se puede enfocar.
    const primero = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!primero) {
      setAviso("No pudimos guardar. Revisá el aviso que aparece arriba.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    primero.closest("details")?.setAttribute("open", "");
    primero.scrollIntoView({ block: "center", behavior: "smooth" });
    primero.focus({ preventScroll: true });

    const nombre = nombreDelCampo(primero);
    const total = contar(erroresRef.current);
    setAviso(
      total > 1
        ? `Hay ${total} campos con problemas. El primero es ${nombre}.`
        : `Revisá el campo ${nombre}.`
    );
  }, [intento]);

  const fe = useCallback((campo: string) => errores[campo]?.[0], [errores]);

  const hayErrorCon = useCallback(
    (prefijo: string) => Object.keys(errores).some((k) => k.startsWith(prefijo)),
    [errores]
  );

  return { formRef, errores, fe, hayErrorCon, reportar, limpiar, aviso };
}

/** Región viva del formulario: anuncia el error sin ocupar lugar en pantalla. */
export function AvisoErrores({ children }: { children: string }) {
  return (
    // Sin `role`: un `role="status"` es implícitamente polite y chocaría con el
    // aria-live de acá. El error frena el guardado, se anuncia sin esperar.
    <p aria-live="assertive" aria-atomic className="sr-only">
      {children}
    </p>
  );
}
