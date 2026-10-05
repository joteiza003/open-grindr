import z from "zod";

export const INBOX_SORTS = ["recent", "unread", "online"] as const;
export type InboxSort = (typeof INBOX_SORTS)[number];
export const inboxSortSchema = z.enum(INBOX_SORTS);

/** Lo que hace falta de una conversación para ordenar el buzón. */
export type SortableConversation = {
	data: {
		conversationId: string;
		pinned: boolean;
		unreadCount: number;
		onlineUntil?: number | null;
		participants: readonly { onlineUntil?: number | null }[];
	};
};

function isOnline(conversation: SortableConversation, now: number): boolean {
	const until =
		conversation.data.onlineUntil ??
		conversation.data.participants[0]?.onlineUntil ??
		null;
	return until !== null && until > now;
}

/**
 * Reordena el buzón. Los chats fijados siguen arriba; dentro de cada grupo, el
 * criterio elegido sube lo suyo y el resto conserva su orden (reciente primero).
 * `recent` deja el orden tal cual.
 */
export function sortInbox<T extends SortableConversation>(
	entries: readonly T[],
	{
		sort,
		markedUnread,
		now,
	}: { sort: InboxSort; markedUnread: ReadonlySet<string>; now: number },
): T[] {
	if (sort === "recent") return [...entries];
	const first = (entry: T): boolean =>
		sort === "unread"
			? entry.data.unreadCount > 0 ||
				markedUnread.has(entry.data.conversationId)
			: isOnline(entry, now);
	const pinned = entries.filter((entry) => entry.data.pinned);
	const rest = entries.filter((entry) => !entry.data.pinned);
	return [
		...pinned,
		...rest.filter((entry) => first(entry)),
		...rest.filter((entry) => !first(entry)),
	];
}
