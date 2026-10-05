import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";

/** Cuántos chats se pueden tener marcados como no leídos a la vez. */
export const MAX_MARKED_UNREAD = 200;

let queue: Promise<unknown> = Promise.resolve();

function update(change: (ids: readonly string[]) => string[]): Promise<void> {
	const run = queue.then(() =>
		setPreferences({ chatMarkedUnread: change(markedUnreadIds()) }),
	);
	queue = run.catch(() => undefined);
	return run;
}

export function markedUnreadIds(): readonly string[] {
	// Los tests de otras pantallas simulan las preferencias a medias.
	return preferencesSnapshot().chatMarkedUnread ?? [];
}

export function isMarkedUnread(conversationId: string): boolean {
	return markedUnreadIds().includes(conversationId);
}

/** Marca o desmarca un chat como pendiente. Es una marca solo local. */
export function toggleMarkedUnread(conversationId: string): Promise<void> {
	return update((ids) =>
		ids.includes(conversationId)
			? ids.filter((id) => id !== conversationId)
			: [...ids, conversationId].slice(-MAX_MARKED_UNREAD),
	);
}

/** Quita la marca (al abrir el chat); no escribe si no estaba marcado. */
export function clearMarkedUnread(conversationId: string): Promise<void> {
	if (!isMarkedUnread(conversationId)) return Promise.resolve();
	return update((ids) => ids.filter((id) => id !== conversationId));
}
