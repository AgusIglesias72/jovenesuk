import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

/**
 * EmailLayout — base template for all transactional emails.
 *
 * Wraps content in JUK branding (header bar in navy, footer with contact).
 * Uses Tailwind for inline styling so emails render consistently across clients.
 *
 * @example
 *   <EmailLayout preview="Reseteá tu contraseña">
 *     <Heading>Hola María</Heading>
 *     <Paragraph>...</Paragraph>
 *   </EmailLayout>
 */

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const JUK_NAVY = "#0A1F44";
const JUK_CORAL = "#d4524d";
const TEXT_PRIMARY = "#1a1f26";
const TEXT_MUTED = "#66728a";

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans m-0 p-0">
          <Container className="max-w-[560px] mx-auto bg-white my-10">
            {/* Header bar */}
            <Section
              className="px-10 py-6"
              style={{ backgroundColor: JUK_NAVY, borderBottom: `3px solid ${JUK_CORAL}` }}
            >
              <Text
                className="m-0 text-white text-base font-semibold tracking-wider uppercase"
                style={{ letterSpacing: "0.08em" }}
              >
                Jóvenes en UK
              </Text>
              <Text
                className="m-0 mt-0.5 text-[11px] uppercase"
                style={{ color: "#9ab4e2", letterSpacing: "0.1em" }}
              >
                Portal Interno
              </Text>
            </Section>

            {/* Body */}
            <Section className="px-10 py-8" style={{ color: TEXT_PRIMARY }}>
              {children}
            </Section>

            {/* Footer */}
            <Hr style={{ borderColor: "#e3e7ee", margin: 0 }} />
            <Section className="px-10 py-6">
              <Text
                className="m-0 text-xs leading-relaxed"
                style={{ color: TEXT_MUTED }}
              >
                Jóvenes en UK · Programas académicos en países de habla inglesa
              </Text>
              <Text
                className="m-0 mt-1 text-xs"
                style={{ color: TEXT_MUTED }}
              >
                <a
                  href="mailto:info@jovenesenuk.com"
                  style={{ color: TEXT_MUTED, textDecoration: "underline" }}
                >
                  info@jovenesenuk.com
                </a>
                {" · "}
                <a
                  href="https://www.jovenesenuk.com"
                  style={{ color: TEXT_MUTED, textDecoration: "underline" }}
                >
                  jovenesenuk.com
                </a>
              </Text>
              <Text
                className="m-0 mt-3 text-[11px]"
                style={{ color: TEXT_MUTED }}
              >
                Este email fue enviado automáticamente desde el Portal de Gestión Interno.
                Si lo recibiste por error, podés ignorarlo.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/* ============================================================
   Reusable primitives for email body
   ============================================================ */

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="m-0 mb-4 font-semibold leading-tight"
      style={{
        fontSize: "24px",
        color: JUK_NAVY,
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: "-0.015em",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="m-0 mb-4 text-[15px] leading-relaxed"
      style={{ color: TEXT_PRIMARY }}
    >
      {children}
    </Text>
  );
}

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "critical";
}

export function EmailButton({ href, children, variant = "primary" }: EmailButtonProps) {
  const bg = variant === "primary" ? JUK_NAVY : JUK_CORAL;
  return (
    <Section className="my-6 text-left">
      <a
        href={href}
        className="inline-block text-white font-semibold no-underline"
        style={{
          backgroundColor: bg,
          padding: "12px 24px",
          borderRadius: "6px",
          fontSize: "14px",
          letterSpacing: "-0.005em",
        }}
      >
        {children}
      </a>
    </Section>
  );
}

export function EmailCallout({ children }: { children: React.ReactNode }) {
  return (
    <Section
      className="my-5 px-4 py-3 rounded"
      style={{ backgroundColor: "#f5f8fd", borderLeft: `3px solid ${JUK_NAVY}` }}
    >
      <Text className="m-0 text-sm" style={{ color: TEXT_PRIMARY }}>
        {children}
      </Text>
    </Section>
  );
}

export function EmailMonoCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="inline-block px-2 py-1 rounded text-sm font-semibold"
      style={{
        backgroundColor: "#f3f5f9",
        color: JUK_NAVY,
        fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
      }}
    >
      {children}
    </code>
  );
}
