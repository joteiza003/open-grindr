import type { MessageKey } from "$lib/i18n/en";

export type WhatsNewEntry = {
	id: string;
	title: MessageKey;
	body: MessageKey;
	/** Pantalla donde se encuentra la novedad. */
	href: string;
};

/**
 * Identificador de esta tanda de novedades. Al cambiarlo, la hoja vuelve a
 * mostrarse una vez a quien ya vio la anterior.
 */
export const WHATS_NEW_VERSION = "2026-10-b";

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
	{
		id: "nav",
		title: "whatsNew.nav.title",
		body: "whatsNew.nav.body",
		href: "/settings/navigation",
	},
	{
		id: "notifications",
		title: "whatsNew.notifications.title",
		body: "whatsNew.notifications.body",
		href: "/notifications",
	},
	{
		id: "rightNow",
		title: "whatsNew.rightNow.title",
		body: "whatsNew.rightNow.body",
		href: "/right-now",
	},
	{
		id: "search",
		title: "whatsNew.search.title",
		body: "whatsNew.search.body",
		href: "/chat",
	},
	{
		id: "ticks",
		title: "whatsNew.ticks.title",
		body: "whatsNew.ticks.body",
		href: "/chat",
	},
	{
		id: "silence",
		title: "whatsNew.silence.title",
		body: "whatsNew.silence.body",
		href: "/settings/silences",
	},
	{
		id: "invisible",
		title: "whatsNew.invisible.title",
		body: "whatsNew.invisible.body",
		href: "/",
	},
	{
		id: "map",
		title: "whatsNew.map.title",
		body: "whatsNew.map.body",
		href: "/map",
	},
];

/**
 * ¿Hay que enseñar las novedades? Solo tras completar la bienvenida y si la
 * versión guardada no es la actual.
 */
export function shouldShowWhatsNew({
	seen,
	latest = WHATS_NEW_VERSION,
	onboardingComplete,
}: {
	seen: string;
	latest?: string;
	onboardingComplete: boolean;
}): boolean {
	return onboardingComplete && seen !== latest;
}
