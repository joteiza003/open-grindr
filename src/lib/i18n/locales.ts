import { z } from "zod";

export const LOCALES = ["en", "es", "eu"] as const;

export type Locale = (typeof LOCALES)[number];

export const localeSchema = z.enum(LOCALES);

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
	en: "English",
	es: "Castellano",
	eu: "Euskera",
};
