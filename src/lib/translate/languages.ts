/** Languages offered for chat translation (ISO 639-1, `zh` = Simplified). */
export const TRANSLATION_LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "es", name: "Castellano" },
	{ code: "eu", name: "Euskera" },
	{ code: "ca", name: "Català" },
	{ code: "gl", name: "Galego" },
	{ code: "fr", name: "Français" },
	{ code: "de", name: "Deutsch" },
	{ code: "it", name: "Italiano" },
	{ code: "pt", name: "Português" },
	{ code: "nl", name: "Nederlands" },
	{ code: "pl", name: "Polski" },
	{ code: "ro", name: "Română" },
	{ code: "ru", name: "Русский" },
	{ code: "tr", name: "Türkçe" },
	{ code: "ar", name: "العربية" },
	{ code: "zh", name: "中文" },
	{ code: "ja", name: "日本語" },
] as const;

export type TranslationLanguageCode =
	(typeof TRANSLATION_LANGUAGES)[number]["code"];

export function languageName(code: string): string {
	const base = code.toLowerCase().split("-")[0] ?? code;
	return TRANSLATION_LANGUAGES.find((l) => l.code === base)?.name ?? code;
}

/** Normalise a provider language tag ("es-ES", "EU") to our two-letter code. */
export function baseLanguage(code: string | undefined): string | undefined {
	if (!code) return undefined;
	return code.toLowerCase().split(/[-_]/)[0];
}

/** Language name in the app's language ("francés"), falling back to our list. */
export function displayLanguageName(code: string, locale: string): string {
	try {
		const name = new Intl.DisplayNames([locale], { type: "language" }).of(
			code,
		);
		if (name && name.toLowerCase() !== code.toLowerCase()) {
			return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
		}
	} catch {
		// Unsupported locale/code: use the static name.
	}
	return languageName(code);
}
