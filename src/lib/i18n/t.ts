import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
import { en, type MessageKey } from "./en";
import { es } from "./es";
import { eu } from "./eu";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es, eu };

export function currentLocale(): Locale {
	return preferencesSnapshot().locale ?? DEFAULT_LOCALE;
}

export function t(
	key: MessageKey,
	vars?: Record<string, string | number>,
): string {
	const locale = currentLocale();
	let text = catalogs[locale]?.[key] ?? en[key] ?? key;
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replaceAll(`{${name}}`, String(value));
		}
	}
	return text;
}
