import { beforeEach, describe, expect, it } from "vitest";

import type { SavedLocation } from "$lib/model/messaging/saved-locations";
import {
	deleteSavedLocation,
	loadSavedLocations,
	upsertSavedLocation,
} from "./saved-locations-library";

// Under vitest isTauri() is false, so the library persists through the
// localStorage-backed web-store. Its reads/writes still cross async
// boundaries, so overlapping upserts interleave exactly as they would on the
// native fs — which is what the write serializer has to defend against.

function loc(localId: string, lat: number, lon: number): SavedLocation {
	return {
		localId,
		conversationId: "conv",
		senderId: null,
		displayName: null,
		lat,
		lon,
		receivedAt: 1,
	};
}

describe("saved locations library", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("keeps every location when captures overlap", async () => {
		await Promise.all([
			upsertSavedLocation(loc("a", 1, 1)),
			upsertSavedLocation(loc("b", 2, 2)),
			upsertSavedLocation(loc("c", 3, 3)),
		]);
		const saved = await loadSavedLocations();
		expect(saved.map((l) => l.localId).sort()).toEqual(["a", "b", "c"]);
	});

	it("upserts the same message in place instead of duplicating", async () => {
		await upsertSavedLocation(loc("a", 1, 1));
		await upsertSavedLocation(loc("a", 9, 9));
		const saved = await loadSavedLocations();
		expect(saved).toHaveLength(1);
		expect(saved[0]?.lat).toBe(9);
	});

	it("removes a saved location", async () => {
		await upsertSavedLocation(loc("a", 1, 1));
		await deleteSavedLocation("a");
		expect(await loadSavedLocations()).toHaveLength(0);
	});
});
