import {
  Alert,
  Button,
  Field,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  Select,
} from "@/components/ui";
import { destinatariosDesdeProspectos, listLotes } from "@/lib/db/queries/invitaciones";
import { listViajesParaFiltro } from "@/lib/db/queries/viajes";
import { esPlaceholder } from "@/lib/domain/configuracion/env";
import { MAX_DESTINATARIOS_LOTE } from "@/lib/domain/inscripciones/invitacion";
import {
  ESTADOS_PROSPECTO,
  PROSPECTO_ESTADO_LABELS,
  prospectoFiltersSchema,
} from "@/lib/domain/prospectos";
import { pagina } from "@/lib/utils/paginate";

import { LotesTable } from "./lotes-table";
import { NuevoLote } from "./nuevo-lote";

/**
 * Invitaciones al Application Form: armar una campaña y seguir las que ya salieron.
 *
 * El universo de destinatarios se calcula EN EL SERVIDOR a partir del filtro de
 * la URL, con las mismas reglas que después aplica la action: así lo que la
 * pantalla promete ("le llega a 34, quedan 6 afuera") es exactamente lo que se
 * va a mandar, y no una cuenta paralela hecha en el navegador.
 *
 * Cuando el filtro se pasa del tope, la lista de destinatarios NO se manda al
 * cliente: no se puede armar una campaña con ellos, y serían miles de filas
 * viajando para nada.
 */

export const metadata = { title: "Invitaciones" };

/** Cuántos excluidos se muestran con nombre y apellido; del resto va el número. */
const MUESTRA_EXCLUIDOS = 20;

/**
 * Entregado, abierto y click los mueve el webhook de Resend: sin
 * `RESEND_WEBHOOK_SECRET` esos tres escalones no se miden NUNCA y quedan en
 * cero. Mostrar ese cero sería mentir —se lee "nadie lo abrió"—, así que la
 * tabla los marca como "no disponible".
 *
 * Un placeholder cuenta como ausente, igual que en la tarjeta de servicios de
 * `/configuracion`: un valor de ejemplo sin reemplazar no verifica ninguna firma.
 */
function trackingDeMailsDisponible(): boolean {
  const secreto = (process.env.RESEND_WEBHOOK_SECRET ?? "").trim();
  return secreto !== "" && !esPlaceholder(secreto);
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InvitacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const parsed = prospectoFiltersSchema.safeParse({
    q: str(sp.q),
    estado: str(sp.estado),
    page: str(sp.page),
  });
  const filtros = parsed.success ? parsed.data : {};
  const criterios = { q: filtros.q, estado: filtros.estado };
  const hayFiltro = Boolean(filtros.q || filtros.estado);

  const [destinatarios, lotes, viajes] = await Promise.all([
    destinatariosDesdeProspectos(criterios),
    listLotes({}, pagina(str(sp.page))),
    listViajesParaFiltro(),
  ]);

  const excedeTope = destinatarios.incluidos.length > MAX_DESTINATARIOS_LOTE;
  const trackingMails = trackingDeMailsDisponible();

  return (
    <>
      <PageHeader
        title="Invitaciones"
        subtitle="Mandá el link al Application Form a los prospectos del CRM. Cada uno recibe el suyo, y el que se dio de baja nunca entra."
        actions={
          <LinkButton href="/prospectos" variant="secondary" className="w-full sm:w-auto">
            Volver al CRM
          </LinkButton>
        }
      />

      {/* Filtro del universo: navegación real (GET) para que el recuento de
          destinatarios lo vuelva a calcular el servidor, que es el único que
          después decide a quién se le manda. */}
      <form
        method="get"
        className="mb-4 grid gap-4 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] sm:items-end"
      >
        <Field label="Buscar">
          <Input
            name="q"
            defaultValue={filtros.q ?? ""}
            placeholder="Nombre, ciudad o mail…"
          />
        </Field>
        <Field label="Etapa del pipeline">
          <Select name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todas</option>
            {ESTADOS_PROSPECTO.map((estado) => (
              <option key={estado} value={estado}>
                {PROSPECTO_ESTADO_LABELS[estado]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Filtrar
        </Button>
      </form>

      <NuevoLote
        viajes={viajes}
        incluidos={excedeTope ? [] : destinatarios.incluidos}
        excluidos={destinatarios.excluidos.slice(0, MUESTRA_EXCLUIDOS)}
        totalIncluidos={destinatarios.incluidos.length}
        totalExcluidos={destinatarios.excluidos.length}
        hayFiltro={hayFiltro}
      />

      <h2 className="mb-3 mt-8 font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        Campañas
      </h2>

      {!trackingMails && (
        <Alert
          level="warning"
          title="Todavía no medimos qué pasa con el mail"
          className="mb-3"
        >
          Falta configurar el webhook de Resend (<code>RESEND_WEBHOOK_SECRET</code>), así que los
          escalones de entrega, apertura y clic aparecen como <strong>no disponible</strong>. No
          quiere decir que nadie los haya abierto: quiere decir que nadie lo está contando. Lo que
          sí se mide es de acá en adelante: quién abrió el formulario y quién mandó la ficha.
        </Alert>
      )}

      <LotesTable lotes={lotes.items} trackingMails={trackingMails} />
      <Pagination total={lotes.total} page={lotes.page} pages={lotes.pages} />
    </>
  );
}
