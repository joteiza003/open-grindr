import { describe, expect, it } from "vitest";

import type { GridProfile } from "./grid";
import {
	needsMoreProfiles,
	randomOrderKey,
	tinderCandidates,
} from "./tinder-deck";

function rendered(id: number, distance: number | null): GridProfile {
	return {
		type: "rendered",
		id,
		displayName: `p${id}`,
		age: 30,
		distance,
		profilePhotosHashes: distance === 7777 ? null : ["hash"],
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

describe("tinderCandidates photos and order", () => {
	it("skips profiles without a photo", () => {
		const ids = tinderCandidates({
			profiles: [rendered(1, 500), rendered(2, 7777)],
			radiusKm: 50,
			decided: new Set(),
		}).map((profile) => profile.id);
		expect(ids).toEqual([1]);
	});

	it("orders by the stable random keys instead of by distance", () => {
		const keys = new Map([
			[1, 0.9],
			[2, 0.1],
			[3, 0.5],
		]);
		const ids = tinderCandidates({
			profiles: [rendered(1, 500), rendered(2, 4000), rendered(3, 9000)],
			radiusKm: 50,
			decided: new Set(),
			keys,
		}).map((profile) => profile.id);
		expect(ids).toEqual([2, 3, 1]);
	});
});

describe("randomOrderKey", () => {
	it("draws once per profile and remembers it", () => {
		const keys = new Map<number, number>();
		const draws = [0.3, 0.8];
		const random = () => draws.shift() ?? 0;
		expect(randomOrderKey(keys, 1, random)).toBe(0.3);
		expect(randomOrderKey(keys, 1, random)).toBe(0.3);
		expect(randomOrderKey(keys, 2, random)).toBe(0.8);
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
