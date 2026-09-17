import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
import { locationRequest } from "$lib/location/location-request.svelte";
import { decodeGeohash } from "$lib/model/geohash";
import {
	draftFromMessage,
	type MessageDraft,
} from "$lib/model/messaging/messages";

export type ChatLocationFix = {
	lat: number;
	lon: number;
	accuracyMeters?: number;
	source: "gps" | "custom";
};

export type ChatLocationOutcome =
	| { ok: true; fix: ChatLocationFix }
	| { ok: false; reason: string; aborted?: boolean };

/**
 * Resolve coordinates only after the user confirms send. GPS on mobile;
 * the stored custom geohash on desktop / when GPS is unavailable.
 */
export async function resolveChatLocation(): Promise<ChatLocationOutcome> {
	const outcome = await locationRequest.run({ prompt: true });
	if (outcome.status === "ok") {
		return {
			ok: true,
			fix: {
				lat: outcome.coords.lat,
				lon: outcome.coords.lon,
				accuracyMeters: outcome.coords.accuracyMeters,
				source: "gps",
			},
		};
	}
	if (outcome.status === "aborted") {
		return { ok: false, reason: "Cancelled.", aborted: true };
	}

	const geohash = preferencesSnapshot().geohash;
	if (geohash) {
		try {
			const decoded = decodeGeohash(geohash);
			return {
				ok: true,
				fix: { lat: decoded.lat, lon: decoded.lon, source: "custom" },
			};
		} catch (error) {
			console.error("[chat-location] Invalid stored geohash", error);
		}
	}

	if (outcome.status === "denied") {
		return { ok: false, reason: "Location permission denied." };
	}
	if (outcome.status === "unsupported") {
		return {
			ok: false,
			reason: "Set a custom location first, or use a device with GPS.",
		};
	}
	return { ok: false, reason: "Couldn't get your location." };
}

export function locationMessageDraft(fix: ChatLocationFix): MessageDraft {
	return draftFromMessage({
		type: "Location",
		body: { lat: fix.lat, lon: fix.lon },
	});
}
