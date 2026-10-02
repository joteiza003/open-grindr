import z from "zod";

export const MAX_STARRED = 300;
export const MAX_STARRED_TEXT = 200;

export const starredMessageSchema = z.object({
	conversationId: z.string().min(1),
	messageId: z.string().min(1),
	/** Texto del mensaje (recortado) o `null` si no es de texto. */
	text: z.string().max(MAX_STARRED_TEXT).nullable(),
	/** Hora del mensaje. */
	timestamp: z.number().int().nonnegative(),
	/** Cuándo se destacó. */
	starredAt: z.number().int().nonnegative(),
});

export type StarredMessage = z.infer<typeof starredMessageSchema>;

export function isStarred(
	list: readonly StarredMessage[],
	messageId: string,
): boolean {
	return list.some((entry) => entry.messageId === messageId);
}

/**
 * Destaca el mensaje o le quita la marca. Al llegar al tope se descarta el
 * destacado más antiguo.
 */
export function toggleStar(
	list: readonly StarredMessage[],
	entry: Omit<StarredMessage, "text"> & { text: string | null },
	max = MAX_STARRED,
): StarredMessage[] {
	if (isStarred(list, entry.messageId)) {
		return list.filter((item) => item.messageId !== entry.messageId);
	}
	const next = [
		...list,
		{ ...entry, text: entry.text?.slice(0, MAX_STARRED_TEXT) ?? null },
	];
	return next.length > max ? next.slice(next.length - max) : next;
}

/** Destacados de una conversación, el mensaje más reciente primero. */
export function starredIn(
	list: readonly StarredMessage[],
	conversationId: string,
): StarredMessage[] {
	return list
		.filter((entry) => entry.conversationId === conversationId)
		.toSorted((a, b) => b.timestamp - a.timestamp);
}
