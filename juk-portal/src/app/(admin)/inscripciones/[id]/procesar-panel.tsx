"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, LinkButton, useConfirm, useToast } from "@/components/ui";
import type { ActionResult } from "@/lib/actions/result";
import {
  accionesDeInscripcion,
  tieneVinculoPendiente,
  type AccionInscripcion,
} from "@/lib/domain/inscripciones/acciones";
import type { InscripcionEstado } from "@/lib/domain/inscripciones/schema";

import {
  anularInscripcionAction,
  borrarDatosInscripcionAction,
  procesarInscripcionAction,
  reintentarAltaAction,
  resolverVinculoAction,
  type ResultadoBandeja,
} from "../actions";

/**
 * Las acciones de la ficha, dentro del panel "Estado" del detalle.
 *
 * El trabajo de esta pantalla no es apretar botones: es que quien mira entienda
 * POR QUÉ el alta no se cerró sola y qué pasa si sigue. El caso que manda es el
 * vínculo con una cuenta del Portal de Familias que ya existe: el formulario es
 * público, y colgar un alumno de la cuenta de otra familia es exactamente lo que
 * una carga anónima no puede conseguir. Por eso, cuando eso está en juego, la
 * advertencia se ve ANTES de tocar nada, y la confirmación llega con los alumnos
 * que hoy tiene esa cuenta a la vista.
 *
 * Qué botones se ofrecen lo decide el dominio (`accionesDeInscripcion`), la
 * misma regla que aplican las server actions: el botón no autoriza nada, solo
 * evita ofrecer algo que la action va a rechazar.
 */

export type ProcesarPanelProps = {
  /** El código público (INS-000123): es lo único que las actions reciben. */
  codigo: string;
  estado: InscripcionEstado;
  alumnoId: string | null;
  /** DNI de la ficha: el slug con el que se abre el alumno. */
  dni: string;
  vinoPorInvitacion: boolean;
  /**
   * Si el que mira puede borrar los datos a pedido. Quien autoriza es la action
   * (`requireRole("super_admin")`); esto solo evita ofrecerle a un admin_juk un
   * botón que lo iba a sacar de la pantalla.
   */
  esSuperAdmin: boolean;
};

const QUE_FALTA: Record<InscripcionEstado, string> = {
  recibida:
    "La ficha entró y todavía no se intentó el alta. Al procesarla se crea el alumno y, si el viaje de la invitación tiene cupo, queda asignado.",
  requiere_revision:
    "El alta no se cerró sola. Mirá el motivo de arriba: ahí está qué le falta a esta ficha.",
  error:
    "El alta falló. La ficha quedó intacta, así que reintentar es seguro: si el DNI ya se hubiera cargado, el alumno existente no se toca.",
  duplicada:
    "Ese DNI ya estaba cargado. No se tocó al alumno existente ni su cuenta de familia: la ficha queda como registro de la carga.",
  procesada: "Listo: el alumno se dio de alta y no queda nada por hacer con esta ficha.",
  anulada:
    "El equipo descartó la ficha. La invitación quedó libre: esa familia puede volver a cargar con el mismo link.",
};

const DETALLE_BORRADO =
  "Se vacían el nombre, el DNI, la fecha de nacimiento, el pasaporte, los teléfonos, los mails y todo lo que la familia contó sobre salud y preferencias. No se recuperan: no hay deshacer. Queda el talón —el número, el estado, la variante, el viaje y las fechas—, así las estadísticas de la campaña siguen dando lo mismo que daban. La ficha sale de la bandeja y esta pantalla deja de existir.";

/**
 * Si la ficha ya creó al alumno, los mismos datos viven también en su legajo, y
 * esto no lo toca. Decirlo acá evita el peor final posible: dar un pedido por
 * cumplido cuando la mitad del dato sigue en el sistema.
 */
const BORRADO_NO_ALCANZA_AL_ALUMNO =
  " Atención: esta ficha ya creó al alumno. Esto borra la inscripción, NO su ficha de alumno ni sus documentos: eso se resuelve desde /alumnos.";

const REVISION_SIN_ALUMNO =
  "Llegó sin una invitación válida, así que el alta no corrió: un formulario público no crea alumnos por su cuenta. Revisá los datos de la ficha y, si están bien, dale de alta vos.";

/**
 * El borrado a pedido no es una acción del ciclo de vida de la ficha (el dominio
 * no lo conoce: no cambia el estado ni habilita nada), pero comparte el "una a
 * la vez" del panel.
 */
type AccionPanel = AccionInscripcion | "borrar_datos";

const LABELS: Record<AccionPanel, string> = {
  procesar: "Dar de alta al alumno",
  reintentar: "Reintentar el alta",
  confirmar_vinculo: "Confirmar la cuenta de familia",
  anular: "Anular la ficha",
  borrar_datos: "Borrar los datos personales",
};

const EN_CURSO: Record<AccionPanel, string> = {
  procesar: "Dando de alta…",
  reintentar: "Reintentando…",
  confirmar_vinculo: "Confirmando…",
  anular: "Anulando…",
  borrar_datos: "Borrando…",
};

/** Qué contarle a quien apretó, según cómo quedó la ficha. */
function avisoDelAlta(data: ResultadoBandeja): { tono: "success" | "info"; mensaje: string } {
  if (!data.ejecutada) {
    return { tono: "info", mensaje: "La ficha ya estaba resuelta: no se tocó nada." };
  }
  switch (data.estado) {
    case "procesada":
      return { tono: "success", mensaje: "Listo: el alumno quedó dado de alta." };
    case "duplicada":
      return {
        tono: "info",
        mensaje: "Ese DNI ya estaba cargado: no se tocó al alumno existente.",
      };
    case "error":
      return { tono: "info", mensaje: "El alta volvió a fallar. Mirá el motivo y reintentá." };
    default:
      return {
        tono: "info",
        mensaje: "El alta corrió, pero la ficha sigue necesitando una revisión. Mirá el motivo.",
      };
  }
}

export function ProcesarPanel({
  codigo,
  estado,
  alumnoId,
  dni,
  vinoPorInvitacion,
  esSuperAdmin,
}: ProcesarPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pendiente, setPendiente] = useState<AccionPanel | null>(null);

  const ficha = { estado, alumnoId };
  const acciones = accionesDeInscripcion(ficha);
  const vinculoPendiente = tieneVinculoPendiente(ficha);
  const trabajando = pendiente !== null;

  async function correr(
    accion: AccionPanel,
    llamar: () => Promise<ActionResult<ResultadoBandeja>>,
    exito?: (data: ResultadoBandeja) => { tono: "success" | "info"; mensaje: string }
  ) {
    setPendiente(accion);
    try {
      const r = await llamar();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const aviso = (exito ?? avisoDelAlta)(r.data);
      if (aviso.tono === "success") toast.success(aviso.mensaje);
      else toast.info(aviso.mensaje);
      router.refresh();
    } finally {
      setPendiente(null);
    }
  }

  async function procesar(accion: Extract<AccionInscripcion, "procesar" | "reintentar">) {
    const { confirmado } = await confirm({
      titulo: accion === "procesar" ? "¿Dar de alta al alumno?" : "¿Reintentar el alta?",
      detalle:
        accion === "procesar"
          ? "Se crea el alumno con los datos de la ficha y, si el viaje tiene cupo, queda asignado. Si el email del tutor ya tiene una cuenta de familia, no la vamos a tocar solos: la ficha vuelve acá para que lo confirmes."
          : "La ficha quedó intacta desde el fallo. Si ese DNI ya se hubiera cargado, el alumno existente no se toca.",
      confirmLabel: accion === "procesar" ? "Sí, dar de alta" : "Sí, reintentar",
      tone: "brand",
    });
    if (!confirmado) return;

    await correr(accion, () =>
      accion === "procesar"
        ? procesarInscripcionAction({ codigo })
        : reintentarAltaAction({ codigo })
    );
  }

  /*
   * Dos vueltas a propósito: la primera no vincula nada, solo trae la
   * advertencia con los alumnos que hoy cuelgan de esa cuenta. Recién con el
   * "sí" explícito la action ejecuta (y lo audita).
   */
  async function confirmarVinculo() {
    setPendiente("confirmar_vinculo");
    const primero = await resolverVinculoAction({ codigo });
    setPendiente(null);

    if (primero.ok) {
      toast.success("Cuenta de familia confirmada: la ficha quedó cerrada.");
      router.refresh();
      return;
    }

    if (!primero.requiereConfirmacion) {
      toast.error(primero.error);
      return;
    }

    const { confirmado } = await confirm({
      titulo: "¿Colgarlo de esa cuenta de familia?",
      detalle: primero.error,
      confirmLabel: "Sí, es la misma familia",
      tone: "warning",
    });
    if (!confirmado) return;

    await correr(
      "confirmar_vinculo",
      () => resolverVinculoAction({ codigo }, { confirmar: true }),
      () => ({
        tono: "success",
        mensaje: "Cuenta de familia confirmada: la ficha quedó cerrada.",
      })
    );
  }

  async function anular() {
    const { confirmado, valor } = await confirm({
      titulo: "¿Anular la ficha?",
      detalle:
        "La ficha deja de estar en juego y su invitación queda libre: esa familia puede volver a cargar con el mismo link. No se borra nada.",
      confirmLabel: "Sí, anular la ficha",
      tone: "danger",
      campo: { label: "Motivo (opcional)", placeholder: "Por qué se descarta" },
    });
    if (!confirmado) return;

    await correr(
      "anular",
      () => anularInscripcionAction({ codigo, motivo: valor }),
      (data) =>
        data.ejecutada
          ? { tono: "success", mensaje: "Ficha anulada. La invitación quedó libre." }
          : { tono: "info", mensaje: "La ficha ya estaba anulada." }
    );
  }

  /**
   * El borrado que pide una familia. La confirmación dice las dos cosas que
   * nadie puede descubrir después: qué se va (y que no vuelve) y qué queda.
   *
   * Al terminar no se refresca: la ficha ya no existe para la bandeja y esta
   * misma pantalla pasa a responder 404. Se vuelve al listado.
   */
  async function borrarDatos() {
    const { confirmado, valor } = await confirm({
      titulo: "¿Borrar los datos personales de esta ficha?",
      detalle:
        alumnoId === null
          ? DETALLE_BORRADO
          : `${DETALLE_BORRADO}${BORRADO_NO_ALCANZA_AL_ALUMNO}`,
      confirmLabel: "Sí, borrar los datos",
      tone: "danger",
      campo: {
        label: "Motivo del borrado (obligatorio)",
        placeholder: "Quién lo pidió y cuándo",
      },
    });
    if (!confirmado) return;

    if (valor === "") {
      toast.error("Escribí el motivo: es el único registro que queda del pedido.");
      return;
    }

    setPendiente("borrar_datos");
    try {
      const r = await borrarDatosInscripcionAction({ codigo, motivo: valor });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.ejecutada) toast.success("Listo: los datos personales de la ficha se borraron.");
      else toast.info("Esa ficha ya estaba borrada.");
      router.replace("/inscripciones");
    } finally {
      setPendiente(null);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-[var(--c-border)] pt-4">
      <p className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        {estado === "requiere_revision" && alumnoId === null
          ? REVISION_SIN_ALUMNO
          : QUE_FALTA[estado]}
      </p>

      {vinculoPendiente && (
        <Alert level="warning" title="Toca una cuenta de familia que ya existe">
          Confirmar cuelga a este alumno de una cuenta del Portal de Familias que ya está creada, y
          esa familia va a verlo en su portal. Antes de ejecutar te mostramos qué alumnos tiene hoy
          esa cuenta: confirmá solo si es la misma familia.
        </Alert>
      )}

      {estado === "recibida" && !vinoPorInvitacion && (
        <Alert level="info" title="Esta ficha no llegó por una invitación">
          Sin token no hay viaje de campaña: el alumno se va a crear pre-inscripto y sin asignar.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {acciones.includes("procesar") && (
          <Button
            type="button"
            variant="primary"
            disabled={trabajando}
            onClick={() => void procesar("procesar")}
          >
            {pendiente === "procesar" ? EN_CURSO.procesar : LABELS.procesar}
          </Button>
        )}

        {acciones.includes("reintentar") && (
          <Button
            type="button"
            variant="primary"
            disabled={trabajando}
            onClick={() => void procesar("reintentar")}
          >
            {pendiente === "reintentar" ? EN_CURSO.reintentar : LABELS.reintentar}
          </Button>
        )}

        {acciones.includes("confirmar_vinculo") && (
          <Button
            type="button"
            variant="primary"
            disabled={trabajando}
            onClick={() => void confirmarVinculo()}
          >
            {pendiente === "confirmar_vinculo"
              ? EN_CURSO.confirmar_vinculo
              : LABELS.confirmar_vinculo}
          </Button>
        )}

        {alumnoId !== null && (
          <LinkButton variant="secondary" href={`/alumnos/${dni}`}>
            Ir a la ficha del alumno
          </LinkButton>
        )}

        {acciones.includes("anular") && (
          <Button
            type="button"
            variant="danger"
            disabled={trabajando}
            onClick={() => void anular()}
          >
            {pendiente === "anular" ? EN_CURSO.anular : LABELS.anular}
          </Button>
        )}
      </div>

      {esSuperAdmin && (
        <div className="flex flex-col gap-2 border-t border-[var(--c-border)] pt-4">
          <p className="text-[length:var(--t-label)] leading-[var(--lh-body)] text-[var(--c-ink-subtle)]">
            Borrado a pedido de la familia (lo promete la Política de Privacidad). Vacía los datos
            personales para siempre y deja el talón: la ficha sigue contando en las estadísticas de
            la campaña, pero sin nadie adentro.
          </p>
          <div>
            <Button
              type="button"
              variant="danger"
              disabled={trabajando}
              onClick={() => void borrarDatos()}
            >
              {pendiente === "borrar_datos" ? EN_CURSO.borrar_datos : LABELS.borrar_datos}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
