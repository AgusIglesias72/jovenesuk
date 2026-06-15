export type DesignVariant = {
  slug: string;
  name: string;
  desc: string;
};

// Las tres direcciones del Design Lab. Cada una vive en src/app/design/<slug>/
// con su propio archivo de tokens.
export const DESIGN_VARIANTS: DesignVariant[] = [
  { slug: "editorial", name: "Editorial", desc: "Refinado y premium. Marca al frente, mucho aire, display serif." },
  { slug: "console", name: "Console", desc: "Denso y operativo. Power-tool, tabular, foco en información." },
  { slug: "studio", name: "Studio", desc: "Cálido y redondeado. Amigable, card-forward, listo para mobile." },
  { slug: "marino", name: "Marino", desc: "JUK sobrio y claro. Navy + oro sobre blanco, redondeado, botones sólidos." },
  { slug: "puerto", name: "Puerto", desc: "JUK sobrio con estructura. Navy con presencia, oro de acento, redondeado." },
  { slug: "autor", name: "Autor", desc: "Diseño de autor, con carácter y oficio — sin la estética genérica de IA." },
  { slug: "shadcn", name: "Shadcn", desc: "La base neutral de shadcn/ui: blanco + neutral, Inter, radio 10px, sin color de marca." },
];
