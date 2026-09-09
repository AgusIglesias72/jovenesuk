"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Badge,
  Button,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
  useToast,
} from "@/components/ui";
import { USUARIO_ROLE_LABELS, USUARIO_ROLES } from "@/lib/domain/usuarios";
import type { UsuarioListItem } from "@/lib/db/queries/usuarios";

import {
  cambiarRolUsuarioAction,
  reenviarAccesoUsuarioAction,
  setActivoUsuarioAction,
} from "./actions";

export function UsuariosTable({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
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

  return (
    <>
      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Usuario</TH>
              <TH>Rol</TH>
              <TH>Estado</TH>
              <TH className="w-[240px]" />
            </TR>
          </THead>
          <TBody>
            {usuarios.map((u) => {
              const isSelf = u.id === currentUserId;
              const role = u.role as (typeof USUARIO_ROLES)[number];
              return (
                <TR key={u.id}>
                  <TD>
                    <div className="font-semibold text-juk-navy-950">
                      {u.name}
                      {isSelf && <span className="ml-2 text-xs font-normal text-gray-500">(vos)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </TD>
                  <TD>
                    {isSelf ? (
                      <Badge tone="brand">{USUARIO_ROLE_LABELS[role]}</Badge>
                    ) : (
                      <div className="w-40">
                        <Select
                          value={role}
                          disabled={isPending}
                          onChange={(e) =>
                            run(
                              () => cambiarRolUsuarioAction(u.id, e.target.value),
                              "Rol actualizado"
                            )
                          }
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
                  <TD>
                    <Badge tone={u.isActive ? "success" : "neutral"}>
                      {u.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-2">
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
                          onClick={() =>
                            run(
                              () => setActivoUsuarioAction(u.id, !u.isActive),
                              u.isActive ? "Usuario desactivado" : "Usuario activado"
                            )
                          }
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
    </>
  );
}
