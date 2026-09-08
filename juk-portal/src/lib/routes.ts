/**
 * Fuente única de las rutas de la app. Módulo PURO (sin imports de next,
 * react ni db): lo consumen el proxy (edge), robots.ts, el shell admin y el
 * saneo de `returnTo` en el login.
 */

/** Prefijos del back-office y portales (requieren sesión). */
export const PORTAL_PREFIXES = [
  "/dashboard",
  "/alumnos",
  "/viajes",
  "/colegios",
  "/prospectos",
  "/consultas",
  "/group-leaders",
  "/usuarios",
  "/pagos",
  "/configuracion",
  "/familias",
] as const;

/** Rutas de autenticación (públicas, pero redirigen si ya hay sesión). */
export const AUTH_PREFIXES = ["/login", "/reset-password"] as const;

/** Páginas del sitio público de marketing (sin auth). */
export const PUBLIC_PAGES = [
  "/",
  "/quienes-somos",
  "/salidas",
  "/programas",
  "/contacto",
  "/consulta",
] as const;

/** Prefijos públicos adicionales (contenido SEO). */
export const PUBLIC_PREFIXES = ["/notas"] as const;

/**
 * Rutas sueltas que se sirven sin sesión (páginas utilitarias). `/offline` la
 * cachea el service worker en el install; `/baja` se abre desde el link del
 * email con `?token=` y valida server-side.
 */
export const STANDALONE_PUBLIC_PATHS = ["/baja", "/offline"] as const;

export const HOME_BY_ROLE = {
  super_admin: "/dashboard",
  admin_juk: "/dashboard",
  representante: "/dashboard",
  familia: "/familias",
} as const;

export type RolConHome = keyof typeof HOME_BY_ROLE;

const empiezaCon = (path: string, prefijos: readonly string[]) =>
  prefijos.some((p) => path === p || path.startsWith(p + "/"));

export function esRutaPortal(path: string): boolean {
  return empiezaCon(path, PORTAL_PREFIXES);
}

export function esRutaAuth(path: string): boolean {
  return empiezaCon(path, AUTH_PREFIXES);
}

export function esPaginaPublica(path: string): boolean {
  return (
    (PUBLIC_PAGES as readonly string[]).includes(path) || empiezaCon(path, PUBLIC_PREFIXES)
  );
}

export function esRutaStandalone(path: string): boolean {
  return (STANDALONE_PUBLIC_PATHS as readonly string[]).includes(path);
}

/** Rutas que robots.txt debe excluir de la indexación. */
export const ROBOTS_DISALLOW = [...PORTAL_PREFIXES, ...AUTH_PREFIXES, "/api/"] as const;
