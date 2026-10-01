import z from "zod";

import {
	moveItem,
	normalizeSubset,
	toggleItem,
	withHidden,
} from "$lib/util/ordered-subset";

/** Pestañas que pueden aparecer en la barra de navegación. */
export const NAV_TAB_IDS = [
	"browse",
	"carrousel",
	"rightNow",
	"interest",
	"chat",
	"notifications",
] as const;

export type NavTabId = (typeof NAV_TAB_IDS)[number];

export const navTabIdSchema = z.enum(NAV_TAB_IDS);

/** Pestañas visibles de fábrica, en orden. Right Now es opcional. */
export const DEFAULT_NAV_TABS: readonly NavTabId[] = [
	"browse",
	"carrousel",
	"interest",
	"chat",
	"notifications",
];

/** Con menos pestañas la barra deja de tener sentido. */
export const MIN_NAV_TABS = 2;

/**
 * Deja una lista válida: sin ids desconocidos ni repetidos y con el mínimo de
 * pestañas. Si no llega al mínimo se vuelve a la lista de fábrica.
 */
export function normalizeNavTabs(tabs: readonly unknown[]): NavTabId[] {
	return normalizeSubset({
		items: tabs,
		allowed: NAV_TAB_IDS,
		min: MIN_NAV_TABS,
		fallback: DEFAULT_NAV_TABS,
	});
}

/** Todas las pestañas: primero las visibles (en su orden) y luego las ocultas. */
export function orderedNavTabs(visible: readonly NavTabId[]) {
	return withHidden(visible, NAV_TAB_IDS);
}

/** Mueve una pestaña visible `delta` posiciones; no sale de los extremos. */
export function moveNavTab(
	visible: readonly NavTabId[],
	id: NavTabId,
	delta: -1 | 1,
): NavTabId[] {
	return moveItem(visible, id, delta);
}

/** Muestra u oculta una pestaña; ocultar no deja menos del mínimo. */
export function toggleNavTab(
	visible: readonly NavTabId[],
	id: NavTabId,
): NavTabId[] {
	return toggleItem(visible, id, MIN_NAV_TABS);
}
