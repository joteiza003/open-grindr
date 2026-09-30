import { describe, expect, it } from "vitest";

import type { GridProfile } from "./grid";
import { needsMoreProfiles, tinderCandidates } from "./tinder-deck";

function rendered(id: number, distance: number | null): GridProfile {
	return {
		type: "rendered",
		id,
		displayName: `p${id}`,
		age: 30,
		distance,
		profilePhotosHashes: null,
		unread: null,
		onlineUntil: null,
		seen: null,
		isFavorite: false,
		isVisiting: false,
		hasChattedInLast24Hrs: false,
	};
}

const lazy = (id: number): GridProfile => ({
	type: "lazy",
	id,
	unread: null,
	isVisiting: false,
});

describe("tinderCandidates", () => {
	const profiles = [
		rendered(1, 500),
		rendered(2, 4000),
		rendered(3, 9000),
		rendered(4, null),
		lazy(5),
	];

	it("keeps rendered profiles inside the radius", () => {
		const ids = tinderCandidates({
			profiles,
			radiusKm: 5,
			decided: new Set(),
		}).map((profile) => profile.id);
		expect(ids).toEqual([1, 2]);
	});

	it("skips profiles already decided", () => {
		const ids = tinderCandidates({
			profiles,
			radiusKm: 10,
			decided: new Set([2]),
		}).map((profile) => profile.id);
		expect(ids).toEqual([1, 3]);
	});
});

describe("needsMoreProfiles", () => {
	it("asks for more while the deck is short and inside the radius", () => {
		expect(
			needsMoreProfiles({
				profiles: [rendered(1, 500)],
				radiusKm: 5,
				candidateCount: 1,
			}),
		).toBe(true);
	});

	it("stops once the loaded list is past the radius", () => {
		expect(
			needsMoreProfiles({
				profiles: [rendered(1, 500), rendered(2, 9000)],
				radiusKm: 5,
				candidateCount: 1,
			}),
		).toBe(false);
	});

	it("waits for unresolved profiles and for a full deck", () => {
		expect(
			needsMoreProfiles({
				profiles: [rendered(1, 500), lazy(2)],
				radiusKm: 5,
				candidateCount: 1,
			}),
		).toBe(false);
		expect(
			needsMoreProfiles({
				profiles: [rendered(1, 500)],
				radiusKm: 5,
				candidateCount: 3,
			}),
		).toBe(false);
	});
});
