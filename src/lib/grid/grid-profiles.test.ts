import { describe, expect, it } from "vitest";

import type { LazyGridProfile } from "./grid";
import {
	dedupeGridProfiles,
	indexProfilesById,
	sortGridProfilesByDistance,
} from "./grid-profiles";
import { rendered } from "./grid-test-helpers";

function lazy(id: number): LazyGridProfile {
	return { type: "lazy", id, unread: null, isVisiting: false };
}

describe("dedupeGridProfiles", () => {
	it("keeps the first occurrence of a rendered profile in place", () => {
		const first = { ...rendered({ id: 2 }), displayName: "First" };
		const profiles = dedupeGridProfiles([
			rendered({ id: 1 }),
			first,
			rendered({ id: 3 }),
			{ ...rendered({ id: 2 }), displayName: "Second" },
		]);

		expect(profiles).toEqual([
			rendered({ id: 1 }),
			first,
			rendered({ id: 3 }),
		]);
	});

	it("lets a rendered row replace a lazy one at the lazy row's position", () => {
		const profiles = dedupeGridProfiles([
			lazy(1),
			rendered({ id: 2 }),
			rendered({ id: 1 }),
		]);

		expect(profiles).toEqual([rendered({ id: 1 }), rendered({ id: 2 })]);
	});

	it("never lets a lazy row replace a rendered one", () => {
		const profiles = dedupeGridProfiles([
			rendered({ id: 1 }),
			rendered({ id: 2 }),
			lazy(1),
		]);

		expect(profiles).toEqual([rendered({ id: 1 }), rendered({ id: 2 })]);
	});
});

describe("indexProfilesById", () => {
	it("maps each id to its position", () => {
		const index = indexProfilesById([
			rendered({ id: 7 }),
			lazy(3),
			rendered({ id: 5 }),
		]);

		expect([...index]).toEqual([
			[7, 0],
			[3, 1],
			[5, 2],
		]);
	});
});

describe("sortGridProfilesByDistance", () => {
	const at = (id: number, distance: number | null) => ({
		...rendered({ id }),
		distance,
	});

	it("puts the closest profile first", () => {
		const sorted = sortGridProfilesByDistance([
			at(1, 900),
			at(2, 50),
			at(3, 400),
		]);

		expect(sorted.map((profile) => profile.id)).toEqual([2, 3, 1]);
	});

	it("sends unresolved rows and rows without a distance to the end", () => {
		const sorted = sortGridProfilesByDistance([
			lazy(1),
			at(2, null),
			at(3, 10),
		]);

		expect(sorted.map((profile) => profile.id)).toEqual([3, 1, 2]);
	});

	it("is stable, so equal distances keep the server's order", () => {
		const sorted = sortGridProfilesByDistance([
			at(5, 100),
			at(4, 100),
			at(6, 100),
		]);

		expect(sorted.map((profile) => profile.id)).toEqual([5, 4, 6]);
	});

	it("does not mutate its input", () => {
		const input = [at(1, 9), at(2, 1)];
		sortGridProfilesByDistance(input);

		expect(input.map((profile) => profile.id)).toEqual([1, 2]);
	});
});
