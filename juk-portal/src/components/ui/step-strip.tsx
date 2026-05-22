import { cn } from "@/lib/utils/cn";
import type { StepState } from "./badge";

/**
 * StepStrip — visualization of the 10-step tracking board (M6).
 *
 * Most-viewed component in the portal. Each pill labeled "01"-"10".
 * Click opens the step detail.
 *
 * The 10 steps in canonical order:
 *   01 · Application Form
 *   02 · Pagos
 *   03 · Immigration Letter
 *   04 · Test de Nivel
 *   05 · Parental Consent
 *   06 · Accommodation Letter
 *   07 · ETA
 *   08 · Autorización escribano
 *   09 · Certificado psicofísico
 *   10 · Último pago presencial
 *
 * @example
 *   <StepStrip
 *     steps={[
 *       { num: 1, state: "completado", label: "Application Form" },
 *       { num: 2, state: "completado", label: "Pagos" },
 *       { num: 3, state: "en_progreso", label: "Immigration Letter" },
 *       // ...
 *     ]}
 *     onStepClick={(num) => router.push(`/alumnos/${id}/pasos/${num}`)}
 *   />
 */

export interface Step {
  num: number;
  state: StepState;
  label: string;
}

const STEP_PILL_CLASSES: Record<StepState, string> = {
  pendiente:   "bg-gray-100 text-gray-500 border-gray-200",
  en_progreso: "bg-blue-50 text-blue-700 border-blue-100",
  completado:  "bg-green-50 text-green-700 border-green-100",
  bloqueado:   "bg-red-50 text-red-700 border-red-100",
  na:          "bg-white text-gray-400 border-gray-200 border-dashed",
};

interface StepStripProps {
  steps: Step[];
  onStepClick?: (num: number) => void;
  className?: string;
}

export function StepStrip({ steps, onStepClick, className }: StepStripProps) {
  return (
    <div className={cn("grid grid-cols-10 gap-1", className)}>
      {steps.map((s) => (
        <button
          key={s.num}
          type="button"
          title={`${String(s.num).padStart(2, "0")} · ${s.label}`}
          onClick={() => onStepClick?.(s.num)}
          aria-label={`Paso ${s.num}: ${s.label} (${s.state})`}
          className={cn(
            "h-7 flex items-center justify-center rounded-sm border font-mono text-[11px] font-bold",
            "transition-transform duration-150 hover:-translate-y-px",
            "focus-visible:outline-none focus-visible:shadow-focus",
            STEP_PILL_CLASSES[s.state]
          )}
        >
          {String(s.num).padStart(2, "0")}
        </button>
      ))}
    </div>
  );
}

/**
 * StepLegend — legend strip for the StepStrip.
 * Optional; use when introducing the pattern to a new admin.
 */
export function StepLegend({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-gray-500 m-0 flex flex-wrap gap-x-3 gap-y-1", className)}>
      <span className="text-green-700">■ Completado</span>
      <span className="text-blue-700">■ En progreso</span>
      <span className="text-gray-600">■ Pendiente</span>
      <span className="text-red-700">■ Bloqueado</span>
      <span>◌ N/A</span>
    </p>
  );
}

/**
 * Canonical labels for the 10 steps. Use this constant to avoid typos.
 */
export const STEP_LABELS: Record<number, string> = {
  1:  "Application Form",
  2:  "Pagos",
  3:  "Immigration Letter",
  4:  "Test de Nivel",
  5:  "Parental Consent",
  6:  "Accommodation Letter",
  7:  "ETA",
  8:  "Autorización (escribano)",
  9:  "Certificado psicofísico",
  10: "Último pago presencial",
};
