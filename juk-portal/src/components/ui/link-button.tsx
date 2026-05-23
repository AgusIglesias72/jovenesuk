import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";

type LinkButtonProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Un Next <Link> con el look de un Button (para navegar, no para acciones). */
export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
