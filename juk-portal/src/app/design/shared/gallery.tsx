/*
 * Sección "Componentes" de la dirección STUDIO: la biblioteca completa,
 * estilo shadcn, agrupada por familias. Server component — los demos con
 * estado viven en ./interactive.tsx.
 */
import type { ReactNode } from "react";

import {
  AccordionItem,
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Banner,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  EmptyState,
  FieldNote,
  Input,
  Kbd,
  Label,
  Pagination,
  Progress,
  Radio,
  Screen,
  ScreenHeading,
  SectionTitle,
  Segmented,
  Skeleton,
  StatDelta,
  Switch,
  Timeline,
  Tooltip,
  cn,
} from "./primitives";
import {
  BottomSheetDemo,
  CommandDemo,
  CounterFieldDemo,
  DateRangeDemo,
  DialogDemo,
  DrawerDemo,
  DropdownDemo,
  FormModalDemo,
  PopoverDemo,
  SearchDemo,
  SelectMenu,
  SliderDemo,
  TabsDemo,
  ToastsDemo,
} from "./interactive";

/* ── Marco de cada demo ──────────────────────────────────────────── */
function DemoCard({
  title,
  note,
  children,
  wide,
  canvas = true,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  wide?: boolean;
  canvas?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", wide && "md:col-span-2")}>
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--c-border)] px-5 py-3.5">
        <h4 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          {title}
        </h4>
        {note && <p className="text-right text-[11px] text-[var(--c-ink-subtle)]">{note}</p>}
      </div>
      <div className={cn("flex-1 p-5", canvas && "bg-[var(--c-surface-3)]")}>{children}</div>
    </Card>
  );
}

function Group({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-10 first:mt-0">
      <SectionTitle kicker={kicker}>{title}</SectionTitle>
      <div className="mt-4 grid gap-5 md:grid-cols-2">{children}</div>
    </div>
  );
}

/* ── Datos de muestra ────────────────────────────────────────────── */
const BADGES_VIAJE = [
  { label: "Inscripción abierta", k: "abierta" },
  { label: "Confirmado", k: "confirmado" },
  { label: "En curso", k: "en_curso" },
  { label: "Finalizado", k: "finalizado" },
  { label: "Cancelado", k: "cancelado" },
];

const BADGES_PASO = [
  { label: "Pendiente", k: "pendiente" },
  { label: "En progreso", k: "en_progreso" },
  { label: "Completado", k: "completado" },
  { label: "Bloqueado", k: "bloqueado" },
  { label: "N/A", k: "na" },
];

const BADGES_POLICE = [
  { label: "Pendiente", k: "pendiente" },
  { label: "En trámite", k: "en_tramite" },
  { label: "Aprobado", k: "aprobado" },
  { label: "Vencido", k: "vencido" },
];

const EQUIPO = ["Paula Vidal", "Mariano Sosa", "Agustín Iglesias", "Carla Méndez", "Diego Ruiz", "Sol Pereyra"];

const MOVIMIENTOS = [
  { icon: "💷", titulo: "Cuota 3 · Familia Álvarez", categoria: "Plan de pagos", fecha: "Hoy, 10:24", monto: "+£450,00" },
  { icon: "🏫", titulo: "Reserva · Brighton Language College", categoria: "Colegio", fecha: "Ayer", monto: "−£2.400,00" },
  { icon: "💷", titulo: "Cuota 2 · Familia Benítez", categoria: "Plan de pagos", fecha: "08/06", monto: "+£450,00" },
  { icon: "🚌", titulo: "Seña transfers aeropuerto", categoria: "Transporte", fecha: "07/06", monto: "−£380,00" },
  { icon: "🎟️", titulo: "Excursión · Tower of London", categoria: "Excursiones", fecha: "05/06", monto: "−£640,00" },
];

type MenuGrupo = {
  titulo: string;
  items: { icon: string; label: string; activo?: boolean; badge?: string }[];
};

const MENUS: MenuGrupo[][] = [
  [
    {
      titulo: "Operación",
      items: [
        { icon: "📊", label: "Dashboard", activo: true },
        { icon: "✈️", label: "Viajes" },
        { icon: "🎒", label: "Alumnos" },
        { icon: "🏫", label: "Colegios" },
        { icon: "🧑‍✈️", label: "Group Leaders" },
      ],
    },
    {
      titulo: "Planificación",
      items: [
        { icon: "💷", label: "Pagos", badge: "3" },
        { icon: "📄", label: "Documentos" },
        { icon: "📈", label: "Reportes" },
      ],
    },
  ],
  [
    {
      titulo: "Cuenta",
      items: [
        { icon: "👤", label: "Perfil" },
        { icon: "🔔", label: "Notificaciones" },
        { icon: "🔒", label: "Seguridad" },
      ],
    },
    {
      titulo: "Soporte",
      items: [
        { icon: "❓", label: "Centro de ayuda" },
        { icon: "✉️", label: "Contacto" },
        { icon: "🧭", label: "Estado del sistema" },
      ],
    },
  ],
];

const ACCIONES_RAPIDAS = [
  { icon: "✈️", titulo: "Crear un viaje", desc: "Código, fechas, colegio y cupo en un paso." },
  { icon: "🎒", titulo: "Asignar alumnos", desc: "Sumá alumnos a un viaje con el cupo actualizándose en vivo." },
  { icon: "⏰", titulo: "Programar recordatorio", desc: "Aviso automático a las familias antes de cada vencimiento." },
  { icon: "📤", titulo: "Exportar reporte", desc: "Alumnos, pagos y seguimiento en CSV." },
];

const ACTIVIDAD: {
  dia: string;
  eventos: { icon: string; bg: string; que: ReactNode; quien: string; hora: string; derecha?: ReactNode }[];
}[] = [
  {
    dia: "Hoy · 11/06",
    eventos: [
      {
        icon: "✅",
        bg: "var(--c-success-bg)",
        que: (
          <>
            Paso <span className="font-semibold">Visa</span> completado para Catalina Álvarez
          </>
        ),
        quien: "Paula Vidal",
        hora: "10:42",
        derecha: (
          <Badge fg="var(--b-paso-completado)" bg="var(--b-paso-completado-bg)" dot>
            Completado
          </Badge>
        ),
      },
      {
        icon: "💷",
        bg: "var(--c-brand-50)",
        que: <>Pago acreditado · Cuota 3 de la familia Álvarez</>,
        quien: "Sistema",
        hora: "10:24",
        derecha: (
          <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-success)]">
            +£450,00
          </span>
        ),
      },
      {
        icon: "📨",
        bg: "var(--c-info-bg)",
        que: <>Recordatorio de permiso parental enviado a 4 familias</>,
        quien: "Sistema",
        hora: "09:00",
      },
    ],
  },
  {
    dia: "Ayer · 10/06",
    eventos: [
      {
        icon: "📄",
        bg: "var(--c-honey-soft)",
        que: (
          <>
            Documento <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)]">visa-alvarez.pdf</span> subido
          </>
        ),
        quien: "Agustín Iglesias",
        hora: "18:51",
      },
      {
        icon: "🎒",
        bg: "var(--c-accent-soft)",
        que: (
          <>
            Tomás Benítez asignado a <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)]">UK-2026-JUL-LONDON</span>
          </>
        ),
        quien: "Paula Vidal",
        hora: "15:08",
        derecha: (
          <Badge tone="info" dot>
            Cupo 13/24
          </Badge>
        ),
      },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════
 * Pantalla
 * ════════════════════════════════════════════════════════════════ */

export function ComponentesScreen({ n = "08" }: { n?: string }) {
  return (
    <Screen id="componentes">
      <ScreenHeading
        n={n}
        title="Componentes"
        sub="La biblioteca completa de la dirección — todos los bloques con los que se construye el portal, listos para trabajar."
      />

      {/* ── ACCIONES ── */}
      <Group kicker="Familia 1" title="Acciones">
        <DemoCard title="Button" note="4 variantes × 2 tamaños">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Crear viaje</Button>
              <Button variant="accent">+ Nuevo alumno</Button>
              <Button variant="outline">Exportar CSV</Button>
              <Button variant="ghost">Cancelar</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">
                Guardar
              </Button>
              <Button variant="accent" size="sm">
                Asignar
              </Button>
              <Button variant="outline" size="sm">
                Ver más
              </Button>
              <Button variant="primary" disabled>
                Deshabilitado
              </Button>
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Dropdown menu" note="acciones por fila">
          <div className="flex min-h-[120px] items-start">
            <DropdownDemo />
          </div>
        </DemoCard>

        <DemoCard title="Segmented control" note="filtros rápidos, sin JS">
          <div className="space-y-4">
            <Segmented name="seg-viajes" options={["Todos", "Próximos", "En curso", "Pasados"]} defaultValue="Próximos" />
            <Segmented name="seg-moneda" options={["GBP", "ARS"]} />
          </div>
        </DemoCard>

        <DemoCard title="Chips" note="tags y selección múltiple">
          <div className="flex flex-wrap gap-2">
            <Chip selected>Julio 2026</Chip>
            <Chip selected>Londres</Chip>
            <Chip>Brighton</Chip>
            <Chip>Oxford</Chip>
            <Chip removable>Campus</Chip>
            <Chip removable>Homestay</Chip>
          </div>
        </DemoCard>
      </Group>

      {/* ── FORMULARIOS ── */}
      <Group kicker="Familia 2" title="Formularios">
        <DemoCard title="Input" note="todos los estados">
          <div className="space-y-4">
            <div>
              <Label htmlFor="g-in-1" required>
                Nombre del viaje
              </Label>
              <Input id="g-in-1" placeholder="Londres en Julio · Campus" />
              <FieldNote>Aparece tal cual en el portal de las familias.</FieldNote>
            </div>
            <div>
              <Label htmlFor="g-in-2" required>
                Código
              </Label>
              <Input id="g-in-2" defaultValue="UK-2026-JUL-LONDN" invalid />
              <FieldNote error>El código no respeta el patrón UK-YYYY-MMM-CITY.</FieldNote>
            </div>
            <div>
              <Label htmlFor="g-in-3">Creado por</Label>
              <Input id="g-in-3" defaultValue="Solo lectura" disabled />
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Select & Textarea con contador" note="dropdown propio, no el nativo">
          <div className="space-y-4">
            <div>
              <Label htmlFor="g-sel-1">Colegio destino</Label>
              <SelectMenu
                id="g-sel-1"
                defaultValue="London School of English"
                options={["London School of English", "Brighton Language College", "Oxford International"]}
              />
            </div>
            <CounterFieldDemo />
          </div>
        </DemoCard>

        <DemoCard title="Search con sugerencias" note="autocomplete vivo">
          <div className="min-h-[150px]">
            <SearchDemo />
          </div>
        </DemoCard>

        <DemoCard title="File upload" note="documentos del paso">
          <div className="grid min-h-[150px] place-items-center rounded-[var(--r-lg)] border-2 border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface)] p-6 text-center transition-colors hover:border-[var(--c-brand-300)]">
            <div>
              <span className="text-2xl" aria-hidden>
                📎
              </span>
              <p className="mt-2 font-semibold text-[var(--c-ink)]">
                Arrastrá el pasaporte acá
              </p>
              <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                PDF o JPG · hasta 10 MB · o{" "}
                <span className="font-semibold text-[var(--c-brand)] underline">buscalo</span>
              </p>
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Date picker" note="rango editable · meses navegables" wide>
          <DateRangeDemo />
        </DemoCard>
      </Group>

      {/* ── SELECCIÓN ── */}
      <Group kicker="Familia 3" title="Selección">
        <DemoCard title="Checkbox & Radio">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Checkbox id="g-ck-1" label="Autoriza salidas grupales" defaultChecked />
              <Checkbox id="g-ck-2" label="Recibe emails" defaultChecked />
              <Checkbox id="g-ck-3" label="Asistencia especial" />
              <Checkbox id="g-ck-4" label="Beca (bloqueado)" disabled />
            </div>
            <div>
              <Radio
                id="g-rd-1"
                name="g-origen"
                label="Colegio"
                hint="El viaje sale de una institución"
                defaultChecked
              />
              <Radio id="g-rd-2" name="g-origen" label="Representante" hint="Vendedor independiente" />
              <Radio id="g-rd-3" name="g-origen" label="Directo" hint="La familia llegó sola" />
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Switch & Slider">
          <div className="space-y-5">
            <div className="grid gap-1">
              <Switch id="g-sw-1" label="Alertas de vencimiento de pasaporte" defaultChecked />
              <Switch id="g-sw-2" label="Resumen semanal por email" />
              <Switch id="g-sw-3" label="Modo mantenimiento" disabled />
            </div>
            <Divider />
            <SliderDemo />
          </div>
        </DemoCard>
      </Group>

      {/* ── FEEDBACK ── */}
      <Group kicker="Familia 4" title="Feedback">
        <DemoCard title="Alerts" note="4 tonos">
          <div className="space-y-3">
            <Alert tone="info" title="Inscripción abierta hasta el 15/06">
              Después de esa fecha el viaje pasa a confirmación.
            </Alert>
            <Alert tone="success" title="Migración completada">
              Los 60 alumnos quedaron al día.
            </Alert>
            <Alert
              tone="warning"
              title="3 pasaportes vencen antes del viaje"
              action={
                <Button variant="outline" size="sm">
                  Verlos
                </Button>
              }
            >
              Conviene avisarles a las familias esta semana.
            </Alert>
            <Alert tone="danger" title="El pago de la cuota 4 fue rechazado">
              Reintentá o cambiá el medio de pago.
            </Alert>
          </div>
        </DemoCard>

        <DemoCard title="Toasts" note="se apilan y se van solos">
          <ToastsDemo />
        </DemoCard>

        <DemoCard title="Progress & Skeleton">
          <div className="space-y-5">
            <Progress label="Cupo · Londres" value={50} />
            <Progress label="Seguimiento M6 · Catalina" value={80} warm />
            <Divider label="cargando" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 !rounded-[var(--r-pill)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-20 w-full !rounded-[var(--r-lg)]" />
          </div>
        </DemoCard>

        <DemoCard title="Empty state & Banner">
          <div className="space-y-4">
            <Card>
              <EmptyState
                icon="🧭"
                title="Todavía no hay viajes en 2027"
                action={
                  <Button variant="accent" size="sm">
                    + Crear el primero
                  </Button>
                }
              >
                Cuando crees uno, aparece acá con su seguimiento.
              </EmptyState>
            </Card>
            <Banner
              action={
                <Button variant="outline" size="sm" className="!border-transparent !bg-[rgba(255,255,255,0.35)] !text-[var(--c-ink-onaccent)] hover:!bg-[rgba(255,255,255,0.5)]">
                  Completar
                </Button>
              }
            >
              ✦ Faltan 3 police checks para confirmar Brighton.
            </Banner>
          </div>
        </DemoCard>

        <DemoCard title="Loading oficial" note="GlobeLoader — components/ui/globe-loader.tsx" wide canvas={false}>
          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)]">
            <iframe
              src="/globe-loader.html"
              title="GlobeLoader — loader oficial del portal"
              className="h-44 w-full"
            />
          </div>
          <p className="mt-2.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Único loader permitido en el portal. Nada de spinners ad-hoc: cualquier estado de carga
            monta este componente.
          </p>
        </DemoCard>
      </Group>

      {/* ── DATOS ── */}
      <Group kicker="Familia 5" title="Datos">
        <DemoCard title="Badges de dominio" note="viaje · pasos · police check" wide>
          <div className="space-y-4">
            {[
              { label: "Estado de viaje", items: BADGES_VIAJE, prefix: "viaje" },
              { label: "Estado de paso (M6/M7)", items: BADGES_PASO, prefix: "paso" },
              { label: "Police check", items: BADGES_POLICE, prefix: "police" },
            ].map((fam) => (
              <div key={fam.prefix}>
                <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                  {fam.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {fam.items.map((b) => (
                    <Badge
                      key={b.k}
                      fg={`var(--b-${fam.prefix}-${b.k})`}
                      bg={`var(--b-${fam.prefix}-${b.k}-bg)`}
                      dot
                    >
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DemoCard>

        <DemoCard title="Avatars">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name="Paula Vidal" size="sm" />
              <Avatar name="Mariano Sosa" hue={1} />
              <Avatar name="Agustín Iglesias" size="lg" hue={2} />
            </div>
            <Divider label="grupo" />
            <AvatarGroup names={EQUIPO} />
          </div>
        </DemoCard>

        <DemoCard title="Stat con tendencia">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatDelta label="Inscriptos del mes" value="14" delta="+27%" up />
            <StatDelta label="Pagos pendientes" value="6" delta="-2" up={false} />
          </div>
        </DemoCard>

        <DemoCard title="Tooltip & Kbd">
          <div className="flex flex-wrap items-center gap-6 py-4">
            <Tooltip tip="El pasaporte vence el 14/02/2026 — antes del regreso">
              <Badge tone="danger" dot>
                Pasaporte ⚠
              </Badge>
            </Tooltip>
            <Tooltip tip="Asignada al viaje UK-2026-JUL-LONDON">
              <Avatar name="Catalina Álvarez" hue={3} />
            </Tooltip>
            <p className="flex items-center gap-1.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Abrí la búsqueda con <Kbd>⌘</Kbd>
              <Kbd>K</Kbd> · guardá con <Kbd>⌘</Kbd>
              <Kbd>S</Kbd>
            </p>
          </div>
        </DemoCard>

        <DemoCard title="Tabla compacta" note="orden + hover" wide canvas={false}>
          <div className="-m-5 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                  <th className="px-5 py-3 font-bold">
                    <span className="inline-flex cursor-pointer items-center gap-1 hover:text-[var(--c-brand)]">
                      Viaje <span aria-hidden>↓</span>
                    </span>
                  </th>
                  <th className="px-5 py-3 font-bold">Fechas</th>
                  <th className="px-5 py-3 font-bold">Cupo</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "UK-2026-JUL-LONDON", fechas: "04/07 – 25/07", cupo: "12/24", estado: BADGES_VIAJE[0] },
                  { code: "UK-2026-JUL-BRIGHTON", fechas: "11/07 – 01/08", cupo: "18/20", estado: BADGES_VIAJE[1] },
                  { code: "UK-2026-AGO-OXFORD", fechas: "08/08 – 29/08", cupo: "5/16", estado: BADGES_VIAJE[0] },
                ].map((r, i) => (
                  <tr
                    key={r.code}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-[var(--c-brand-50)]",
                      i % 2 ? "bg-[var(--c-surface-3)]" : "bg-[var(--c-surface)]",
                    )}
                  >
                    <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
                      {r.code}
                    </td>
                    <td className="px-5 py-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{r.fechas}</td>
                    <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink)]">
                      {r.cupo}
                    </td>
                    <td className="px-5 py-3">
                      {r.estado && (
                        <Badge fg={`var(--b-viaje-${r.estado.k})`} bg={`var(--b-viaje-${r.estado.k}-bg)`} dot>
                          {r.estado.label}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DemoCard>

        <DemoCard title="Timeline" note="audit log de un paso" wide>
          <Timeline
            items={[
              {
                when: "28/05/2026 18:42",
                who: "Paula Vidal",
                what: (
                  <>
                    Marcó <span className="font-semibold">Visa</span> como{" "}
                    <span className="font-semibold text-[var(--c-success)]">completado</span> para Catalina Álvarez
                  </>
                ),
                accent: true,
              },
              {
                when: "27/05/2026 11:15",
                who: "Sistema",
                what: <>Recordatorio automático enviado a 4 familias por el permiso parental</>,
              },
              {
                when: "26/05/2026 09:30",
                who: "Agustín Iglesias",
                what: (
                  <>
                    Subió el documento <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)]">visa-alvarez.pdf</span>
                  </>
                ),
              },
            ]}
          />
        </DemoCard>
      </Group>

      {/* ── NAVEGACIÓN ── */}
      <Group kicker="Familia 6" title="Navegación">
        <DemoCard title="Tabs" note="ficha del alumno">
          <TabsDemo />
        </DemoCard>

        <DemoCard title="Breadcrumb & Pagination">
          <div className="space-y-6 py-2">
            <Breadcrumb items={["Viajes", "UK-2026-JUL-LONDON", "Seguimiento"]} />
            <Divider />
            <Pagination page={2} total={5} />
          </div>
        </DemoCard>

        <DemoCard title="Accordion" note="exclusivo: abrir uno cierra el resto">
          <Card className="px-5 py-1.5">
            <AccordionItem group="faq" title="¿Qué pasa si un pasaporte vence durante el viaje?" defaultOpen>
              El sistema lo bloquea en el paso 1 del M6: UK exige pasaporte vigente hasta el fin del
              viaje (no hace falta margen extra).
            </AccordionItem>
            <AccordionItem group="faq" title="¿Quién puede aprobar un police check?">
              Solo coordinación. Los group leaders ven el estado pero no lo editan.
            </AccordionItem>
            <AccordionItem group="faq" title="¿Cómo se libera un cupo?">
              Dando de baja la asignación del alumno: el cupo se recalcula al instante.
            </AccordionItem>
          </Card>
        </DemoCard>

        <DemoCard title="Command palette" note="⌘K global">
          <CommandDemo />
        </DemoCard>
      </Group>

      {/* ── PANELES & LISTAS ── */}
      <Group kicker="Familia 7" title="Paneles & listas">
        <DemoCard title="Movimientos recientes" note="cashflow de la cuenta del viaje" wide canvas={false}>
          <div className="-m-5">
            <div className="flex items-center justify-between gap-3 p-5 pb-3">
              <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                Última actividad de <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--c-ink)]">UK-2026-JUL-LONDON</span>
              </p>
              <Button variant="outline" size="sm">
                Ver todo
              </Button>
            </div>
            <ul>
              {MOVIMIENTOS.map((m) => (
                <li
                  key={m.titulo}
                  className="flex items-center gap-4 border-t border-[var(--c-border)] px-5 py-3.5 transition-colors hover:bg-[var(--c-surface-3)]"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-md)] text-lg"
                    style={{ backgroundColor: "var(--c-surface-2)" }}
                    aria-hidden
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{m.titulo}</p>
                    <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{m.categoria}</p>
                  </div>
                  <span className="hidden text-[length:var(--t-small)] text-[var(--c-ink-subtle)] sm:block">
                    {m.fecha}
                  </span>
                  <span
                    className="w-24 text-right font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold"
                    style={{ color: m.monto.startsWith("+") ? "var(--c-success)" : "var(--c-ink)" }}
                  >
                    {m.monto}
                  </span>
                  <button
                    type="button"
                    aria-label={`acciones de ${m.titulo}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
                  >
                    ⋯
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DemoCard>

        <DemoCard title="Menú lateral" note="secciones agrupadas + ítem activo">
          <div className="flex flex-wrap gap-4">
            {MENUS.map((menu) => (
              <Card key={menu[0]?.titulo} className="min-w-[200px] flex-1 p-2.5">
                {menu.map((grupo, gi) => (
                  <div key={grupo.titulo} className={gi > 0 ? "mt-3" : ""}>
                    <p className="px-3 pb-1.5 pt-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                      {grupo.titulo}
                    </p>
                    <ul className="space-y-0.5">
                      {grupo.items.map((item) => (
                        <li key={item.label}>
                          <a
                            href="#componentes"
                            aria-current={item.activo ? "page" : undefined}
                            className={cn(
                              "flex min-h-[40px] items-center gap-2.5 rounded-[var(--r-md)] px-3 text-[length:var(--t-small)] transition-colors",
                              item.activo
                                ? "bg-[var(--c-brand-50)] font-bold text-[var(--c-brand)]"
                                : "font-medium text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]",
                            )}
                          >
                            <span aria-hidden>{item.icon}</span>
                            {item.label}
                            {item.badge && (
                              <span className="ml-auto rounded-[var(--r-pill)] bg-[var(--c-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--c-accent-600)]">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </DemoCard>

        <DemoCard title="Acciones rápidas" note="atajos con descripción">
          <div className="space-y-4">
            <Breadcrumb items={["Inicio", "…", "Pagos"]} />
            <div className="space-y-2.5">
              {ACCIONES_RAPIDAS.map((a) => (
                <a
                  key={a.titulo}
                  href="#componentes"
                  className="group flex items-start gap-3.5 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--c-brand-300)] hover:shadow-[shadow:var(--shadow-1)]"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] text-base"
                    style={{ backgroundColor: "var(--c-brand-50)" }}
                    aria-hidden
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                      {a.titulo}
                    </span>
                    <span className="block text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                      {a.desc}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 text-[var(--c-ink-subtle)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--c-brand)]"
                  >
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
        </DemoCard>

        <DemoCard title="Actividad detallada" note="feed agrupado por día" wide canvas={false}>
          <div className="-m-5">
            {ACTIVIDAD.map((dia) => (
              <div key={dia.dia}>
                <p className="border-b border-[var(--c-border)] bg-[var(--c-surface-2)] px-5 py-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                  {dia.dia}
                </p>
                <ul>
                  {dia.eventos.map((e) => (
                    <li
                      key={`${e.hora}-${e.quien}`}
                      className="flex items-center gap-4 border-b border-[var(--c-border)] px-5 py-3.5 last:border-b-0"
                    >
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-pill)] text-base"
                        style={{ backgroundColor: e.bg }}
                        aria-hidden
                      >
                        {e.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[length:var(--t-body)] text-[var(--c-ink)]">{e.que}</p>
                        <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                          <span className="font-semibold text-[var(--c-ink-muted)]">{e.quien}</span> ·{" "}
                          <span className="font-[family-name:var(--font-mono)]">{e.hora}</span>
                        </p>
                      </div>
                      {e.derecha}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DemoCard>
      </Group>

      {/* ── OVERLAYS ── */}
      <Group kicker="Familia 8" title="Overlays">
        <DemoCard title="Dialog" note="confirmación destructiva">
          <div className="flex min-h-[100px] items-center">
            <DialogDemo />
          </div>
        </DemoCard>

        <DemoCard title="Drawer" note="ficha rápida lateral">
          <div className="flex min-h-[100px] items-center">
            <DrawerDemo />
          </div>
        </DemoCard>

        <DemoCard title="Modal con formulario" note="alta rápida sin salir de la pantalla">
          <div className="flex min-h-[100px] items-center">
            <FormModalDemo />
          </div>
        </DemoCard>

        <DemoCard title="Popover" note="detalle de un paso al click">
          <div className="flex min-h-[100px] items-center">
            <PopoverDemo />
          </div>
        </DemoCard>

        <DemoCard title="Bottom sheet" note="acciones mobile-first">
          <div className="flex min-h-[100px] items-center">
            <BottomSheetDemo />
          </div>
        </DemoCard>
      </Group>
    </Screen>
  );
}
