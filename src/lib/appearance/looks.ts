import { z } from "zod";

import type { AccentKey } from "$lib/appearance/accents";
import type { BackdropBlurQuality } from "$lib/blur/quality";

/**
 * Looks de fábrica del sistema «Lumen» (design/04-implementacion.md §3).
 *
 * Un look es un paquete de **preferencias existentes** (tema, acento, densidad)
 * más un tratamiento de superficie que la hoja de estilos keyea por
 * `data-look` en `<html>`: grano, lavado del acento, dureza de los bordes y
 * escala de elevación. Elegirlo no inventa estado nuevo más allá de `look`:
 * las tres preferencias que toca ya se pueden cambiar por separado después, y
 * el look sigue aportando su material.
 *
 * El desenfoque de fondo queda **fuera** del paquete a propósito: se calibra
 * por dispositivo (`src/lib/blur/quality.svelte.ts`) y un preset no debe pisar
 * esa medición. `blur` se declara solo como referencia documental.
 *
 * `label` es un nombre propio, igual que los de `accents.ts`: no es texto
 * traducible y por eso no pasa por `t()` — la i18n no añade claves
 * (design/04-implementacion.md §4.5). Mantener `key` en sync con
 * `src/layout.css` (`:root[data-look="…"]`).
 */
export const looks = [
	{
		key: "lumen",
		label: "Lumen",
		theme: "system",
		accent: "amber",
		density: "comfortable",
		blur: "medium",
		// Solo para pintar el selector: acento + superficie del look.
		accentSwatch: "oklch(0.82 0.17 85)",
		surfaceSwatch: "oklch(0.145 0.006 265)",
	},
	{
		key: "porcelain",
		label: "Porcelain",
		theme: "light",
		accent: "blue",
		density: "comfortable",
		blur: "medium",
		accentSwatch: "oklch(0.82 0.15 250)",
		surfaceSwatch: "oklch(0.99 0.002 265)",
	},
	{
		key: "midnight",
		label: "Midnight",
		theme: "dark",
		accent: "amber",
		density: "comfortable",
		blur: "max",
		accentSwatch: "oklch(0.82 0.17 85)",
		surfaceSwatch: "oklch(0.16 0.01 85)",
	},
	{
		key: "slate",
		label: "Slate",
		theme: "dark",
		accent: "teal",
		density: "compact",
		blur: "medium",
		accentSwatch: "oklch(0.82 0.13 190)",
		surfaceSwatch: "oklch(0.185 0.01 250)",
	},
] as const satisfies readonly {
	key: string;
	label: string;
	theme: "system" | "dark" | "light";
	accent: AccentKey;
	density: "comfortable" | "compact";
	blur: BackdropBlurQuality;
	accentSwatch: string;
	surfaceSwatch: string;
}[];

export type LookKey = (typeof looks)[number]["key"];

const lookKeys = looks.map((look) => look.key) as [LookKey, ...LookKey[]];

export const lookSchema = z.enum(lookKeys);

export const DEFAULT_LOOK: LookKey = "lumen";

export function lookPreset(key: LookKey): (typeof looks)[number] {
	return looks.find((look) => look.key === key) ?? looks[0];
}
