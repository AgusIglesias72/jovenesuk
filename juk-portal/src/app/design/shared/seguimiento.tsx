/*
 * Sección "Seguimiento M6" de la dirección STUDIO: el tablero de pasos del
 * alumno según el PRD (Paso 0 + Grupos A/B/C/D, 11 pasos, 6 estados) y la
 * matriz del viaje con la completitud. Es el próximo gran bloque del portal.
 */
import {
  Avatar,
  Badge,
  Button,
  Card,
  Progress,
  Screen,
  ScreenHeading,
  SectionTitle,
  Tooltip,
  cn,
} from "./primitives";

/* ── Estados ─────────────────────────────────────────────────────── */

type EstadoPaso = "pendiente" | "en_progreso" | "completado" | "bloqueado" | "na" | "vencido";

const ESTADO_LABEL: Record<EstadoPaso, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  na: "N/A",
  vencido: "Vencido",
};

function estadoVars(estado: EstadoPaso) {
  return { fg: `var(--b-paso-${estado})`, bg: `var(--b-paso-${estado}-bg)` };
}

/* ── Tablero del alumno (Paso 0 + Grupos A–D) ────────────────────── */

type Paso = { codigo: string; nombre: string; estado: EstadoPaso; nota?: string };
type Grupo = { letra: string; nombre: string; pasos: Paso[] };

const GRUPOS: Grupo[] = [
  {
    letra: "A",
    nombre: "Inscripción y programa",
    pasos: [
      { codigo: "A1", nombre: "Application Form", estado: "vencido", nota: "Venció el 05/06 — reabrir con el colegio" },
      { codigo: "A2", nombre: "Test de Nivel", estado: "completado" },
      { codigo: "A3", nombre: "Parental Consent", estado: "en_progreso" },
    ],
  },
  {
    letra: "B",
    nombre: "Pagos",
    pasos: [
      { codigo: "B1", nombre: "Plan de cuotas", estado: "en_progreso", nota: "3 de 6 cuotas acreditadas" },
      { codigo: "B2", nombre: "Último pago presencial", estado: "pendiente" },
    ],
  },
  {
    letra: "C",
    nombre: "Documentación de viaje",
    pasos: [
      { codigo: "C1", nombre: "ETA", estado: "completado" },
      { codigo: "C2", nombre: "Immigration Letter", estado: "bloqueado", nota: "Requiere B1 completado" },
      { codigo: "C3", nombre: "Accommodation Letter", estado: "pendiente" },
    ],
  },
  {
    letra: "D",
    nombre: "Documentación legal AR",
    pasos: [
      { codigo: "D1", nombre: "Autorización ante escribano", estado: "en_progreso" },
      { codigo: "D2", nombre: "Cert. aptitud psicofísica", estado: "na", nota: "Viaje con Group Leader" },
    ],
  },
];

function PasoCard({ paso }: { paso: Paso }) {
  const c = estadoVars(paso.estado);
  const apagado = paso.estado === "na";
  return (
    <div
      className={cn(
        "rounded-[var(--r-md)] border p-3 transition-shadow hover:shadow-[shadow:var(--shadow-1)]",
        apagado
          ? "border-dashed border-[var(--c-border)] bg-transparent opacity-70"
          : "border-[var(--c-border)] bg-[var(--c-surface)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-subtle)]">
          {paso.codigo}
        </span>
        <Badge fg={c.fg} bg={c.bg} dot>
          {ESTADO_LABEL[paso.estado]}
        </Badge>
      </div>
      <p className={cn("mt-1.5 text-[length:var(--t-small)] font-semibold", apagado ? "text-[var(--c-ink-subtle)]" : "text-[var(--c-ink)]")}>
        {paso.nombre}
      </p>
      {paso.nota && (
        <p
          className="mt-1.5 inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[11px] font-medium"
          style={
            paso.estado === "bloqueado" || paso.estado === "vencido"
              ? { color: c.fg, backgroundColor: c.bg }
              : { color: "var(--c-ink-subtle)", backgroundColor: "var(--c-surface-2)" }
          }
        >
          {(paso.estado === "bloqueado" && <span aria-hidden>🔒</span>) ||
            (paso.estado === "vencido" && <span aria-hidden>⏰</span>)}
          {paso.nota}
        </p>
      )}
    </div>
  );
}

/* ── Matriz del viaje ────────────────────────────────────────────── */

const COLS = ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "D1", "D2"];

type FilaMatriz = { alumno: string; hue: number; estados: EstadoPaso[] };

const MATRIZ: FilaMatriz[] = [
  { alumno: "Álvarez, Catalina", hue: 0, estados: ["vencido", "completado", "en_progreso", "en_progreso", "pendiente", "completado", "bloqueado", "pendiente", "en_progreso", "na"] },
  { alumno: "Benítez, Tomás", hue: 1, estados: ["completado", "completado", "completado", "completado", "na", "completado", "completado", "completado", "completado", "na"] },
  { alumno: "Castro, Malena", hue: 2, estados: ["en_progreso", "pendiente", "pendiente", "pendiente", "pendiente", "pendiente", "bloqueado", "pendiente", "pendiente", "na"] },
  { alumno: "Domínguez, Ignacio", hue: 3, estados: ["completado", "completado", "na", "en_progreso", "pendiente", "completado", "bloqueado", "completado", "na", "na"] },
];

function completitud(fila: FilaMatriz) {
  const aplicables = fila.estados.filter((e) => e !== "na");
  const done = aplicables.filter((e) => e === "completado").length;
  return { done, total: aplicables.length, pct: Math.round((done / aplicables.length) * 100) };
}

function DotEstado({ estado, paso, alumno }: { estado: EstadoPaso; paso: string; alumno: string }) {
  const c = estadoVars(estado);
  return (
    <Tooltip tip={`${paso} · ${ESTADO_LABEL[estado]} — ${alumno}`}>
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-[5px]",
          estado === "na" && "border border-dashed border-[var(--c-border-strong)] !bg-transparent",
        )}
        style={{ backgroundColor: c.bg, boxShadow: estado === "na" ? undefined : `inset 0 0 0 1.5px ${"color-mix(in srgb, " + c.fg + " 55%, transparent)"}` }}
      >
        {estado === "completado" && (
          <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" style={{ color: c.fg }}>
            <path d="M4 8.5 7 11.5 12 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </Tooltip>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Pantalla
 * ════════════════════════════════════════════════════════════════ */

export function SeguimientoScreen({ n = "04" }: { n?: string }) {
  const fila = MATRIZ[0];
  return (
    <Screen id="seguimiento">
      <ScreenHeading
        n={n}
        title="Seguimiento M6"
        sub="El tablero de pasos del alumno (Paso 0 + Grupos A–D) y la matriz del viaje — el próximo gran bloque del portal."
      />

      {/* header del alumno */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <Avatar name="Catalina Álvarez" size="lg" />
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
              Catalina Álvarez
            </h3>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--c-brand)]">UK-2026-JUL-LONDON</span>
              {" "}· asignada el 02/05/2026
            </p>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <Progress label="Pasos aplicables completados" value={fila ? completitud(fila).pct : 0} warm />
          <p className="mt-1 text-right text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            {fila ? `${completitud(fila).done} de ${completitud(fila).total}` : ""} · 2 pasos N/A automáticos
          </p>
        </div>
      </Card>

      {/* Paso 0 */}
      <Card className="mb-5 flex flex-wrap items-center gap-4 border-[var(--c-border-brand)] bg-[var(--c-brand-50)] p-4">
        <span className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] bg-[var(--c-surface)] text-lg" aria-hidden>
          🌱
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--c-ink)]">
            Paso 0 · Origen del alumno{" "}
            <span className="ml-1 rounded-[var(--r-xs)] bg-[var(--c-surface)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              solo lectura
            </span>
          </p>
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Vía Google Form · 14/04/2026 19:32 — se completa automático, nadie lo toca a mano.
          </p>
        </div>
        <Badge fg="var(--b-paso-completado)" bg="var(--b-paso-completado-bg)" dot>
          Completado
        </Badge>
      </Card>

      {/* grupos A–D */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GRUPOS.map((g) => (
          <Card key={g.letra} className="p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-[var(--r-sm)] font-[family-name:var(--font-display)] text-[length:var(--t-small)] font-extrabold text-[var(--c-brand)]"
                style={{ backgroundColor: "var(--c-brand-100)" }}
              >
                {g.letra}
              </span>
              <p className="text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">{g.nombre}</p>
            </div>
            <div className="space-y-2.5">
              {g.pasos.map((p) => (
                <PasoCard key={p.codigo} paso={p} />
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* matriz del viaje */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle kicker="Vista del viaje">Matriz UK-2026-JUL-LONDON</SectionTitle>
          <Button variant="outline" size="sm">
            Exportar
          </Button>
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                  <th className="px-5 py-3 font-bold">Alumno</th>
                  {COLS.map((c) => (
                    <th key={c} className="px-1.5 py-3 text-center font-[family-name:var(--font-mono)] font-bold">
                      {c}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right font-bold">Completitud</th>
                </tr>
              </thead>
              <tbody>
                {MATRIZ.map((f, i) => {
                  const comp = completitud(f);
                  return (
                    <tr key={f.alumno} className={i % 2 ? "bg-[var(--c-surface-3)]" : "bg-[var(--c-surface)]"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={f.alumno} size="sm" hue={f.hue} />
                          <span className="whitespace-nowrap text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                            {f.alumno}
                          </span>
                        </div>
                      </td>
                      {f.estados.map((e, j) => (
                        <td key={j} className="px-1.5 py-3 text-center">
                          <DotEstado estado={e} paso={COLS[j] ?? ""} alumno={f.alumno} />
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right">
                        <span
                          className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold"
                          style={{ color: comp.pct === 100 ? "var(--c-success)" : "var(--c-ink)" }}
                        >
                          {comp.pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* leyenda + completitud del viaje */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--c-border)] bg-[var(--c-surface-3)] px-5 py-3.5">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ESTADO_LABEL) as EstadoPaso[]).map((e) => (
                <Badge key={e} fg={estadoVars(e).fg} bg={estadoVars(e).bg} dot>
                  {ESTADO_LABEL[e]}
                </Badge>
              ))}
            </div>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Completitud del viaje:{" "}
              <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--c-ink)]">
                1/4 alumnos al día
              </span>
            </p>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
