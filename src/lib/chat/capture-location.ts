import { upsertSavedLocation } from "./saved-locations-library";

/**
 * Index a location another user shared with us. Fire-and-forget: it must never
 * block or affect chat delivery. Callers pass only received (non-own) location
 * coordinates. Deduped by conversation + message id, so re-capturing the same
 * message on re-render is harmless.
 */
export function captureLocationMessage(
	location: {
		conversationId: string;
		messageId: string;
		senderId: number | null;
		timestamp: number;
		lat: number;
		lon: number;
	},
	displayName: string | null,
): void {
	void upsertSavedLocation({
		localId: `${location.conversationId}:${location.messageId}`,
		conversationId: location.conversationId,
		senderId: location.senderId,
		displayName,
		lat: location.lat,
		lon: location.lon,
		receivedAt: location.timestamp,
	}).catch((error: unknown) => {
		console.error("[location-map] Failed to capture location", error);
	});
}
