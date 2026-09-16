import { z } from "zod";

/**
 * Accent presets for the appearance personalization layer.
 *
 * `key` is persisted in preferences and set as `data-accent` on <html>; the
 * matching color tokens live in src/layout.css under `:root[data-accent="…"]`.
 * Keep these keys in sync with that stylesheet. `swatch` is only used to paint
 * the picker in Settings.
 *
 * "amber" is the default and matches the base `:root` tokens, so it needs no
 * override block in the stylesheet.
 */
export const accents = [
	{ key: "amber", label: "Amber", swatch: "oklch(86.521% 0.17664 90.372)" },
	{ key: "blue", label: "Blue", swatch: "oklch(0.72 0.15 250)" },
	{ key: "teal", label: "Teal", swatch: "oklch(0.8 0.13 190)" },
	{ key: "green", label: "Green", swatch: "oklch(0.8 0.17 145)" },
	{ key: "violet", label: "Violet", swatch: "oklch(0.72 0.16 300)" },
	{ key: "pink", label: "Pink", swatch: "oklch(0.78 0.16 350)" },
	{ key: "orange", label: "Orange", swatch: "oklch(0.78 0.17 55)" },
	{ key: "red", label: "Red", swatch: "oklch(0.7 0.19 25)" },
] as const;

export type AccentKey = (typeof accents)[number]["key"];

const accentKeys = accents.map((accent) => accent.key) as [
	AccentKey,
	...AccentKey[],
];

export const accentSchema = z.enum(accentKeys);

export const DEFAULT_ACCENT: AccentKey = "amber";
