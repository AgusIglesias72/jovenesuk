import { USUARIO_ROLES } from "./schema";

export const USUARIO_ROLE_LABELS: Record<(typeof USUARIO_ROLES)[number], string> = {
  admin_juk: "Admin JUK",
  super_admin: "Super Admin",
};
