"use client";

import { useState, useTransition } from "react";

import { Button, Field, Select, useToast } from "@/components/ui";
import type { FormularioSettings } from "@/lib/domain/configuracion/formulario";
import { VARIANTE_LABELS } from "@/lib/domain/inscripciones/labels";
import { VARIANTES, type Variante } from "@/lib/domain/inscripciones/schema";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

import { guardarFormularioSettingsAction } from "./actions";

/**
 * Qué piel sirve el Application Form público por defecto.
 *
 * La elección es SOLO estética: las tres variantes comparten los campos, la
 * validación, la server action y el árbol accesible. Por eso la pantalla no
 * ofrece "editar el formulario": ofrece elegir con cuál se ve.
 */

/** Qué mira el equipo para decidir. Copy de back-office: la familia nunca lo ve. */
const DETALLE_VARIANTE: Record<Variante, string> = {
  a: "La gramática del back-office traída al sitio público: geometría recta, sin gradientes y con los rótulos de sección numerados. Es la base y el default.",
  b: "Editorial y cálida, sobre papel crema: volanta numerada, título en la tipografía display y una nota de confianza bajo los campos sensibles (el pasaporte, el celular del tutor).",
  c: "Una sola columna pensada contra el abandono desde el teléfono: controles grandes, secciones como paradas que se tildan al completarse y una barra de progreso fina arriba.",
};

/**
 * URL de la vista previa, escrita COMPLETA como literal por variante: nada de
 * interpolar el querystring. El `?v=` es el escalón de mayor precedencia de
 * `resolverVariante`, así que la previa muestra la piel elegida aunque todavía
 * no se haya guardado.
 */
const PREVIEW_URL: Record<Variante, string> = {
  a: "/inscripcion?v=a",
  b: "/inscripcion?v=b",
  c: "/inscripcion?v=c",
};

export function FormularioForm({ initial }: { initial: FormularioSettings }) {
  const toast = useToast();
  const [variante, setVariante] = useState<Variante>(initial.varianteActiva);
  const [error, setError] = useState<string | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUnsavedChanges(dirty);

  function elegir(valor: string) {
    // El <option> siempre trae una variante conocida; el guard es por si el DOM
    // llega alterado, y evita mandar basura a la action.
    const conocida = VARIANTES.find((v) => v === valor);
    if (!conocida) return;
    setVariante(conocida);
    setError(undefined);
    setDirty(true);
  }

  function guardar() {
    setError(undefined);
    startTransition(async () => {
      try {
        const res = await guardarFormularioSettingsAction({ varianteActiva: variante });
        if (res.ok) {
          setDirty(false);
          toast.success("Variante del formulario guardada.");
        } else {
          setError(res.fieldErrors?.varianteActiva?.[0] ?? res.error);
          toast.error(res.error);
        }
      } catch {
        toast.error("No pudimos guardar. Probá de nuevo.");
      }
    });
  }

  return (
    <section
      className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]"
      data-config-formulario
    >
      <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        Variante del formulario de inscripción
      </h2>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Con cuál de las tres se muestra el Application Form público. Cambia solo cómo se ve: los
        campos, las validaciones y la ficha que recibe el equipo son los mismos en las tres. Un link
        de invitación con su propia variante, o una campaña que fijó la suya, mandan sobre esta
        elección.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <Field label="Variante activa" error={error}>
            <Select
              value={variante}
              invalid={!!error}
              onChange={(e) => elegir(e.target.value)}
            >
              {VARIANTES.map((v) => (
                <option key={v} value={v}>
                  {VARIANTE_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={guardar} disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar variante"}
        </Button>
      </div>

      <p className="mt-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-2)] px-4 py-3 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
        {DETALLE_VARIANTE[variante]}
      </p>

      <h3 className="mt-5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        Vista previa
      </h3>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Es la pantalla real y completa —cabecera, ficha, columna de ayuda y pie—, sin link de
        invitación y sin poder enviarse: se muestra en un marco aislado, así que ningún click de acá
        adentro llega a la base. Por lo mismo la previa no interactúa: no responde a los clicks ni
        muestra la validación en vivo ni el avance de la barra de progreso. Para probar eso, abrí el
        formulario en una pestaña.
      </p>
      {/* Mismo camino que la previa de templates: iframe con `sandbox=""`. Sin
          scripts la página no hidrata y el formulario no puede enviarse, y al
          ser un documento aparte la piel se aplica entera (el CSS de las
          variantes cuelga del <body>, ver `src/styles/form-variants.css`).

          720px y no 520: con la cabecera nueva arriba, en 520 se veía medio hero
          y ni un campo — justo lo que el equipo mira para elegir la piel. */}
      <iframe
        key={variante}
        title={`Vista previa del formulario — variante ${VARIANTE_LABELS[variante]}`}
        src={PREVIEW_URL[variante]}
        sandbox=""
        loading="lazy"
        className="mt-3 h-[720px] w-full rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-2)]"
      />
    </section>
  );
}
