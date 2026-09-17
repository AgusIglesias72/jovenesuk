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
  // La BANDEJA del back-office. Se parece a `/inscripcion` (el formulario
  // público, que va en STANDALONE_PUBLIC_PATHS) pero no lo pisa: `empiezaCon`
  // compara el prefijo exacto o con `/` atrás, así que "/inscripcion" nunca
  // matchea "/inscripciones" ni al revés.
  "/inscripciones",
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

/**
 * Prefijos públicos adicionales: `/notas` (contenido SEO) y `/privacidad`, que
 * es prefijo y no página exacta porque cada versión publicada del texto legal
 * se sirve en `/privacidad/<AAAA-MM-DD>`: un consentimiento guarda la versión
 * que la familia aceptó y tiene que poder abrirse años después, sin sesión.
 */
export const PUBLIC_PREFIXES = ["/notas", "/privacidad"] as const;

/**
 * Rutas sueltas que se sirven sin sesión (páginas utilitarias). `/offline` la
 * cachea el service worker en el install; `/baja` se abre desde el link del
 * email con `?token=` y valida server-side; `/inscripcion` es el Application
 * Form público, que se abre con `?t=<token>` desde la invitación (o sin token,
 * y entonces la ficha queda para revisión manual).
 *
 * `/inscripcion` NO va en `PUBLIC_PAGES`: no es marketing y vive fuera del
 * route group `(public)` para no heredar nav, footer ni Analytics — el token no
 * puede viajar a Google Analytics dentro de `page_location`.
 */
export const STANDALONE_PUBLIC_PATHS = ["/baja", "/inscripcion", "/offline"] as const;

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
