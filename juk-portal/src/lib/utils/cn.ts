import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Composes Tailwind class strings safely. `twMerge` resolves conflicts
 * (e.g. `px-2 px-4` → `px-4`); `clsx` handles conditional class objects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
