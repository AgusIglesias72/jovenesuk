"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

import { reportarDatoFamiliaAction } from "../../_actions";

/**
 * Permite a la familia avisar que un dato del alumno está mal (PRD 04 ·
 * US-2.3). No edita la ficha: el reporte queda registrado y le llega por email
 * al equipo de JUK, que lo corrige desde el portal interno. Después de enviar
 * queda a la vista una confirmación (el toast se va solo a los segundos).
 */

const CAMPOS = [
  "Nombre y apellido",
  "DNI",
  "Fecha de nacimiento",
  "Pasaporte",
  "Email",
  "Salud / alergias",
  "Datos del tutor",
  "Otro dato",
] as const;

export function ReportarDato({ alumnoDni }: { alumnoDni: string }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [campo, setCampo] = useState<string>(CAMPOS[0]);
  const [comentario, setComentario] = useState("");
  const [enviadoCampo, setEnviadoCampo] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      const res = await reportarDatoFamiliaAction({
        alumnoDni,
        campo,
        comentario: comentario.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Le avisamos al equipo de JUK", {
          descripcion: "Lo revisamos y corregimos el dato a la brevedad.",
        });
        setEnviadoCampo(campo);
        setComentario("");
        setCampo(CAMPOS[0]);
        setAbierto(false);
      } else {
        toast.error("No pudimos enviar el aviso", { descripcion: res.error });
      }
    });
  }

  if (!abierto) {
    return (
      <div className="space-y-3">
        {enviadoCampo && (
          <div
            role="status"
            className="rounded-[var(--r-lg)] border border-[color-mix(in_srgb,var(--c-success)_30%,transparent)] bg-[var(--c-success-bg)] px-4 py-3"
          >
            <p className="text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
              Recibimos tu aviso sobre «{enviadoCampo}»
            </p>
            <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Ya le llegó al equipo de JUK por email y lo vamos a corregir. Si necesitamos algo más, te
              escribimos.
            </p>
          </div>
        )}
        <Button variant="secondary" onClick={() => setAbierto(true)}>
          {enviadoCampo ? "Reportar otro dato" : "Reportar un dato incorrecto"}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
      <div>
        <h3 className="font-display text-base font-bold text-[var(--c-ink)]">
          Reportar un dato incorrecto
        </h3>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Decinos qué dato está mal y, si querés, cuál es el correcto. Le llega un aviso al equipo y lo
          corregimos.
        </p>
      </div>

      <Field label="¿Qué dato está mal?">
        <Select value={campo} onChange={(e) => setCampo(e.target.value)} disabled={pendiente}>
          {CAMPOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Comentario (opcional)" help="Contanos cuál es el valor correcto.">
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={2000}
          disabled={pendiente}
          placeholder="Por ejemplo: el pasaporte correcto es AB1234567."
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button onClick={enviar} disabled={pendiente}>
          {pendiente ? "Enviando…" : "Enviar aviso"}
        </Button>
        <Button variant="secondary" onClick={() => setAbierto(false)} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
