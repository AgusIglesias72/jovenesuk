"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

import { reportarDatoFamiliaAction } from "../../_actions";

/**
 * Permite a la familia avisar que un dato del alumno está mal. No edita la
 * ficha: registra un reporte (auditoría) para que JUK lo corrija. Campo +
 * comentario opcional → reportarDatoFamiliaAction.
 */

const CAMPOS = [
  "Nombre",
  "DNI",
  "Fecha de nacimiento",
  "Pasaporte",
  "Email",
  "Salud/alergias",
] as const;

export function ReportarDato({ alumnoDni }: { alumnoDni: string }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [campo, setCampo] = useState<string>(CAMPOS[0]);
  const [comentario, setComentario] = useState("");
  const [pendiente, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      const res = await reportarDatoFamiliaAction({
        alumnoDni,
        campo,
        comentario: comentario.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Recibimos tu aviso", {
          descripcion: "Lo revisamos y corregimos el dato a la brevedad.",
        });
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
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Reportar un dato incorrecto
      </Button>
    );
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
      <div>
        <h3 className="font-display text-base font-bold text-[var(--c-ink)]">
          Reportar un dato incorrecto
        </h3>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Decinos qué dato está mal y, si querés, agregá un comentario. Lo revisamos y lo corregimos.
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
