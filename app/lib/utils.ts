import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Слияние классов знает отступы формата страницы (`--spacing-page-*`, такт 96): `px-page-x` снаружи заменяет `px-4`
 * компонента; без этого оба класса стояли бы рядом, и побеждал бы порядок утилит в CSS.
 */
const twMerge = extendTailwindMerge({
  extend: { theme: { spacing: ["page-top", "page-x", "page-back"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
