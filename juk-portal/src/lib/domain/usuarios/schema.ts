import { z } from "zod";

// Roles que se gestionan desde este portal (representante/familia son futuros).
export const usuarioRoleEnum = z.enum(["admin_juk", "super_admin"]);
export const USUARIO_ROLES = usuarioRoleEnum.options;

export const usuarioCreateSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre").max(120),
  email: z.string().trim().email("Email inválido"),
  role: usuarioRoleEnum,
});

export type UsuarioCreateData = z.output<typeof usuarioCreateSchema>;
export type UsuarioRole = (typeof USUARIO_ROLES)[number];
