/* Iconos locales (stroke 1.6, 16px) — sin dependencias externas. */
import type { SVGProps } from "react";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon(props: SVGProps<SVGSVGElement> & { d: string }) {
  const { d, ...rest } = props;
  return (
    <svg {...base} className="size-[16px]" {...rest}>
      <path d={d} />
    </svg>
  );
}

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" {...p} />
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <Icon d="M12 5v14M5 12h14" {...p} />;
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.85M16 4.15A3.5 3.5 0 0 1 16 11" {...p} />
);
export const IconPlane = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M21 15.5 14 13l-1.5-7.5a1.5 1.5 0 0 0-2.9 0L8 13l-5 1.5v2l5-1 1 4-1.5 1.5v1l2.5-.8 2.5.8v-1L10 19l1-4 5 1Z" {...p} />
);
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" {...p} />
);
export const IconArrowRight = (p: SVGProps<SVGSVGElement>) => <Icon d="M5 12h14M13 6l6 6-6 6" {...p} />;
export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} />
);
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" {...p} />
);
export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" {...p} />
);
export const IconCog = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 17 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" {...p} />
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => <Icon d="M4 12.5 9 17.5 20 6.5" {...p} />;
export const IconInfo = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01" {...p} />
);
export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 8 0v4" {...p} />
);
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M14 5h5v5M19 5l-8 8M19 13v6H5V5h6" {...p} />
);
export const IconChevron = (p: SVGProps<SVGSVGElement>) => <Icon d="M9 6l6 6-6 6" {...p} />;
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12ZM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" {...p} />
);
