"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  Field,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  TR,
  useToast,
} from "@/components/ui";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import { parseProspectosCsv, type ProspectoImportado } from "@/lib/domain/prospectos";

import { importarProspectosAction } from "../actions";

type Vista =
  | { estado: "vacio" }
  | { estado: "previsualizado"; filas: ProspectoImportado[]; errores: string[] };

export function ImportClient() {
  const router = useRouter();
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [vista, setVista] = useState<Vista>({ estado: "vacio" });
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function leerArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const contenido = typeof reader.result === "string" ? reader.result : "";
      setTexto(contenido);
      setVista(deParse(contenido));
    };
    reader.onerror = () => toast.error("No pudimos leer el archivo.");
    reader.readAsText(file);
    e.target.value = "";
  }

  function deParse(contenido: string): Vista {
    const { filas, errores } = parseProspectosCsv(contenido);
    return { estado: "previsualizado", filas, errores };
  }

  function previsualizar() {
    if (texto.trim() === "") {
      toast.error("Pegá el contenido o subí un archivo primero.");
      return;
    }
    setVista(deParse(texto));
  }

  function importar() {
    if (vista.estado !== "previsualizado" || vista.filas.length === 0) return;
    startTransition(async () => {
      const res = await importarProspectosAction({ texto });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { creadas } = res.data;
      toast.success(
        creadas === 1 ? "Se importó 1 prospecto." : `Se importaron ${creadas} prospectos.`
      );
      router.push("/prospectos");
    });
  }

  const filas = vista.estado === "previsualizado" ? vista.filas : [];
  const errores = vista.estado === "previsualizado" ? vista.errores : [];

  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Pegá las filas"
        help="Una fila por línea, separadas por coma, punto y coma o tabulación. La primera fila es el encabezado."
      >
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={10}
          placeholder={"nombre,email,ciudad,pais\nSt Mary's College,admin@stmarys.uk,Londres,Reino Unido"}
          className="font-mono text-[length:var(--t-small)]"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,.tsv,text/plain"
          onChange={leerArchivo}
          className="hidden"
        />
        <Button variant="secondary" type="button" onClick={() => fileRef.current?.click()}>
          Subir CSV
        </Button>
        <Button variant="secondary" type="button" onClick={previsualizar}>
          Previsualizar
        </Button>
      </div>

      {errores.length > 0 && (
        <div className="rounded-[var(--r-lg)] border border-[var(--c-warning)] bg-[var(--c-warning-bg)] p-4">
          <p className="mb-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
            {errores.length === 1
              ? "1 advertencia al leer los datos"
              : `${errores.length} advertencias al leer los datos`}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            {errores.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {vista.estado === "previsualizado" && (
        <div className="flex flex-col gap-4">
          {filas.length === 0 ? (
            <p className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
              No se encontró ninguna fila válida para importar. Revisá que haya una columna{" "}
              <code className="rounded bg-[var(--c-surface-2)] px-1">nombre</code> y al menos una
              fila con datos.
            </p>
          ) : (
            <>
              <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                {filas.length === 1
                  ? "1 fila lista para importar."
                  : `${filas.length} filas listas para importar.`}
              </p>
              <TableWrap>
                <Table>
                  <THead>
                    <TR hoverable={false}>
                      <TH>Nombre</TH>
                      <TH>Emails</TH>
                      <TH>Teléfonos</TH>
                      <TH>Ciudad</TH>
                      <TH>País</TH>
                      <TH>Contacto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filas.map((fila, i) => (
                      <TR key={i}>
                        <TD className="font-medium text-[var(--c-ink)]">{fila.nombre}</TD>
                        <TD>{fila.emails.join(", ") || "—"}</TD>
                        <TD>{fila.telefonos.join(", ") || "—"}</TD>
                        <TD>{fila.ciudad ?? "—"}</TD>
                        <TD>{fila.pais ? PAIS_LABELS[fila.pais] : "—"}</TD>
                        <TD>{fila.contactoNombre ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
              <div>
                <Button type="button" onClick={importar} disabled={pending}>
                  {pending
                    ? "Importando…"
                    : filas.length === 1
                      ? "Importar 1 prospecto"
                      : `Importar ${filas.length} prospectos`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
