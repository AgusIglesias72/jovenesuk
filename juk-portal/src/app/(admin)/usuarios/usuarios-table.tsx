"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Badge,
  Button,
  EmptyState,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
  useConfirm,
  useToast,
} from "@/components/ui";
import {
  USUARIO_ROLE_LABELS,
  USUARIO_ROLES,
  type UsuarioRole,
} from "@/lib/domain/usuarios";
import type { UsuarioListItem } from "@/lib/db/queries/usuarios";

import {
  cambiarRolUsuarioAction,
  reenviarAccesoUsuarioAction,
  setActivoUsuarioAction,
} from "./actions";

function esRol(valor: string): valor is UsuarioRole {
  return (USUARIO_ROLES as readonly string[]).includes(valor);
}

export function UsuariosTable({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    exito: string
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(exito);
        router.refresh();
      } else {
        toast.error(r.error ?? "Ocurrió un error.");
      }
    });
  }

  // El rol llega por parámetro (leído del evento ANTES del await): el <select>
  // es controlado y React le devuelve el valor de props apenas cierra el handler.
  async function cambiarRol(u: UsuarioListItem, nuevoRol: string) {
    if (!esRol(nuevoRol) || !esRol(u.role) || nuevoRol === u.role) return;
    const tocaSuperAdmin = nuevoRol === "super_admin" || u.role === "super_admin";
    const { confirmado } = await confirm({
      titulo: `¿Cambiar el rol de ${u.name}?`,
      detalle: tocaSuperAdmin
        ? `Pasa de ${USUARIO_ROLE_LABELS[u.role]} a ${USUARIO_ROLE_LABELS[nuevoRol]}. Super Admin es el único rol que puede dar de alta, cambiar de rol y desactivar usuarios.`
        : `Pasa de ${USUARIO_ROLE_LABELS[u.role]} a ${USUARIO_ROLE_LABELS[nuevoRol]}. Sus permisos cambian en cuanto recargue el portal.`,
      tone: tocaSuperAdmin ? "danger" : "warning",
      confirmLabel: "Cambiar rol",
    });
    if (!confirmado) return;
    run(() => cambiarRolUsuarioAction(u.id, nuevoRol), "Rol actualizado");
  }

  async function alternarActivo(u: UsuarioListItem) {
    if (u.isActive) {
      const { confirmado } = await confirm({
        titulo: `¿Desactivar a ${u.name}?`,
        detalle:
          "Deja de poder entrar al portal: su login pasa a fallar. Sus datos y todo lo que cargó se conservan, y podés reactivarlo cuando quieras.",
        tone: "danger",
        confirmLabel: "Sí, desactivar",
      });
      if (!confirmado) return;
    }
    run(
      () => setActivoUsuarioAction(u.id, !u.isActive),
      u.isActive ? "Usuario desactivado" : "Usuario activado"
    );
  }

  if (usuarios.length === 0) {
    return (
      <EmptyState icon="👥" title="Todavía no hay usuarios">
        Los usuarios del equipo se dan de alta desde “+ Nuevo usuario”.
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Usuario</TH>
            <TH>Rol</TH>
            <TH>Estado</TH>
            <TH className="w-[240px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {usuarios.map((u) => {
            const isSelf = u.id === currentUserId;
            const role = u.role as (typeof USUARIO_ROLES)[number];
            return (
              <TR key={u.id}>
                <TD label="Usuario">
                  <span className="block font-semibold text-[var(--c-ink)]">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-[length:var(--t-label)] font-normal text-[var(--c-ink-muted)]">
                        (vos)
                      </span>
                    )}
                  </span>
                  <span className="block break-all text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                    {u.email}
                  </span>
                </TD>
                <TD label="Rol">
                  {isSelf ? (
                    <Badge tone="brand">{USUARIO_ROLE_LABELS[role]}</Badge>
                  ) : (
                    <div className="w-40 max-sm:w-full">
                      <Select
                        value={role}
                        disabled={isPending}
                        aria-label={`Rol de ${u.name}`}
                        onChange={(e) => {
                          void cambiarRol(u, e.target.value);
                        }}
                      >
                        {USUARIO_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {USUARIO_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </TD>
                <TD label="Estado">
                  <Badge tone={u.isActive ? "success" : "neutral"}>
                    {u.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TD>
                <TD className="max-sm:justify-end">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {u.isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          run(
                            () => reenviarAccesoUsuarioAction(u.id),
                            "Le mandamos un link para crear la contraseña."
                          )
                        }
                      >
                        Reenviar acceso
                      </Button>
                    )}
                    {!isSelf && (
                      <Button
                        variant={u.isActive ? "danger" : "secondary"}
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          void alternarActivo(u);
                        }}
                      >
                        {u.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
