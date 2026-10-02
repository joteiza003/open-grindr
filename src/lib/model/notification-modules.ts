import z from "zod";

import {
	moveItem,
	normalizeSubset,
	toggleItem,
	withHidden,
} from "$lib/util/ordered-subset";

/** Módulos que puede mostrar la pestaña Notificaciones. */
export const NOTIFICATION_MODULE_IDS = [
	"unanswered",
	"savedFilters",
	"stats",
	"shortcuts",
] as const;

export type NotificationModuleId = (typeof NOTIFICATION_MODULE_IDS)[number];

export const notificationModuleIdSchema = z.enum(NOTIFICATION_MODULE_IDS);

export const DEFAULT_NOTIFICATION_MODULES: readonly NotificationModuleId[] = [
	"unanswered",
	"savedFilters",
	"stats",
	"shortcuts",
];

/** El panel puede quedarse con un solo módulo. */
export const MIN_NOTIFICATION_MODULES = 1;

export function normalizeNotificationModules(
	modules: readonly unknown[],
): NotificationModuleId[] {
	return normalizeSubset({
		items: modules,
		allowed: NOTIFICATION_MODULE_IDS,
		min: MIN_NOTIFICATION_MODULES,
		fallback: DEFAULT_NOTIFICATION_MODULES,
	});
}

export function orderedNotificationModules(
	visible: readonly NotificationModuleId[],
) {
	return withHidden(visible, NOTIFICATION_MODULE_IDS);
}

export function moveNotificationModule(
	visible: readonly NotificationModuleId[],
	id: NotificationModuleId,
	delta: -1 | 1,
): NotificationModuleId[] {
	return moveItem(visible, id, delta);
}

export function toggleNotificationModule(
	visible: readonly NotificationModuleId[],
	id: NotificationModuleId,
): NotificationModuleId[] {
	return toggleItem(visible, id, MIN_NOTIFICATION_MODULES);
}
