import type { Metadata } from "next";

import {
  Acompanamiento,
  Acreditaciones,
  CtaFinal,
  Faq,
  Hero,
  LeadSection,
  Programas,
  QuienesSomos,
  Salidas,
  StatsBand,
  Testimonios,
} from "./_sections";
import { langAlternates } from "./seo";

// El banner de próxima salida depende de la fecha: se regenera una vez por día
// y la home sigue sirviéndose estática.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: {
    absolute: "Jóvenes en UK | Viajes de estudio y cursos de inglés en el exterior",
  },
  description:
    "Estudiá inglés en el exterior con acompañamiento de verdad: salidas grupales a Londres y Cambridge, viajes para colegios, programas individuales y Study & Work en Irlanda. +10 años, +1.000 estudiantes.",
  alternates: langAlternates("/"),
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <StatsBand />
      <QuienesSomos />
      <Salidas />
      <Programas />
      <Acreditaciones />
      <Acompanamiento />
      <Testimonios />
      <LeadSection />
      <Faq />
      <CtaFinal />
    </>
  );
}
