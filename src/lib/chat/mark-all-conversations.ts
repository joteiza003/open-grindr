import { showErrorToast } from "$lib/api/error-toast";
import {
	getConversations,
	markConversationAsRead,
} from "$lib/api/messaging/conversations";
import type { Conversation } from "$lib/model/messaging/conversations";
import { type MarkAllReadResult, runMarkAllRead } from "./mark-all-read";

const UNREAD_ONLY = {
	unreadOnly: true,
	chemistryOnly: false,
	favoritesOnly: false,
	rightNowOnly: false,
	onlineNowOnly: false,
	distanceMeters: null,
	positions: [],
} as const;

/**
 * Marca como leídas todas las conversaciones con mensajes sin leer, también
 * las que aún no están cargadas en la lista. Las cargadas ponen su contador a
 * cero al instante y lo recuperan si la petición falla; el error se avisa una
 * sola vez al final, no por conversación.
 */
export async function markAllConversationsRead(
	entries: readonly Conversation[],
): Promise<MarkAllReadResult> {
	const byId = new Map(
		entries.map((entry) => [entry.data.conversationId, entry]),
	);
	const result = await runMarkAllRead({
		loadedUnreadIds: entries
			.filter((entry) => entry.data.unreadCount > 0)
			.map((entry) => entry.data.conversationId),
		fetchUnreadPage: async (page) => {
			const response = await getConversations({
				page,
				filters: { ...UNREAD_ONLY, positions: [] },
			});
			return {
				ids: response.entries
					.filter((entry) => entry.data.unreadCount > 0)
					.map((entry) => entry.data.conversationId),
				nextPage: response.nextPage,
			};
		},
		markOne: async (conversationId) => {
			const entry = byId.get(conversationId);
			const clearedCount = entry?.data.unreadCount ?? 0;
			if (entry) entry.data.unreadCount = 0;
			try {
				await markConversationAsRead({ conversationId });
				return true;
			} catch (error) {
				console.error(error);
				if (entry) entry.data.unreadCount += clearedCount;
				return false;
			}
		},
	});
	if (result.failed > 0 || result.listFailed) {
		showErrorToast({
			label: "Failed to mark every conversation as read",
			error: new Error(
				`${result.failed} conversations could not be marked as read`,
			),
		});
	}
	return result;
}
