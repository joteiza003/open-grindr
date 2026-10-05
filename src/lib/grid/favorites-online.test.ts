import { describe, expect, it } from "vitest";

import { onlineFavorites } from "./favorites-online";
import type { GridProfile, RenderedGridProfile } from "./grid";

const NOW = 1_000_000;

function rendered(
	id: number,
	overrides: Partial<RenderedGridProfile> = {},
): RenderedGridProfile {
	return {
		type: "rendered",
		id,
		displayName: `P${id}`,
		age: 30,
		distance: id * 100,
		profilePhotosHashes: ["h"],
		unread: null,
		onlineUntil: NOW + 60_000,
		seen: null,
		isFavorite: true,
		isVisiting: false,
		hasChattedInLast24Hrs: false,
		...overrides,
	};
}

describe("onlineFavorites", () => {
	it("keeps only favorites that are online now", () => {
		const profiles: GridProfile[] = [
			rendered(1),
			rendered(2, { isFavorite: false }),
			rendered(3, { onlineUntil: NOW - 1 }),
			rendered(4, { onlineUntil: null }),
			{ type: "lazy", id: 5, unread: null, isVisiting: false },
			rendered(6),
		];
		expect(onlineFavorites(profiles, NOW).map((p) => p.id)).toEqual([1, 6]);
	});

	it("keeps the order it was given and cuts at the limit", () => {
		const profiles = [rendered(3), rendered(1), rendered(2)];
		expect(onlineFavorites(profiles, NOW, 2).map((p) => p.id)).toEqual([
			3, 1,
		]);
	});
});
