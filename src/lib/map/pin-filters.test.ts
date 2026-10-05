import { describe, expect, it } from "vitest";

import {
	defaultFilters,
	type GridSearchFilters,
} from "$lib/model/browse/grid/filters";
import { compileFilters } from "./pin-filters";
import type { DetailFacts, LiveFacts, ProfileFacts } from "./profile-facts";

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Filters with a few values changed; the values are plain numbers here, not the id types. */
const filtersWith = (patch: Record<string, unknown>): GridSearchFilters => ({
	...structuredClone(defaultFilters),
	...(patch as Partial<GridSearchFilters>),
});

const live = (patch: Partial<LiveFacts> = {}): LiveFacts => ({
	onlineUntil: null,
	age: 30,
	isFavorite: false,
	isNew: false,
	rightNow: false,
	lastChatTimestamp: null,
	hasPhotos: true,
	sexualPosition: undefined,
	...patch,
});

const details = (patch: Partial<DetailFacts> = {}): DetailFacts => ({
	genders: [],
	tags: [],
	tribes: [],
	bodyType: null,
	height: null,
	weight: null,
	relationshipStatus: null,
	nsfw: null,
	lookingFor: [],
	meetAt: [],
	sexualHealth: [],
	sexualPosition: null,
	...patch,
});

const facts = (
	liveFacts: LiveFacts | undefined,
	detailFacts?: DetailFacts | null,
): ProfileFacts => ({ live: liveFacts, details: detailFacts });

const verdict = (
	patch: Record<string, unknown>,
	profile: ProfileFacts | undefined,
) => compileFilters(filtersWith(patch)).verdict(profile, NOW);

describe("without any filter that looks at a profile", () => {
	it("is not active, and everything matches, known or not", () => {
		const compiled = compileFilters(defaultFilters);

		expect(compiled.active).toBe(false);
		expect(compiled.needs).toEqual({ live: false, details: false });
		expect(compiled.verdict(undefined, NOW)).toBe("match");
		expect(compiled.verdict(facts(live()), NOW)).toBe("match");
	});

	it("ignores a filter that is switched off, or set to everything", () => {
		const compiled = compileFilters(
			filtersWith({
				ageEnabled: false,
				age: [25, 35],
				tribesEnabled: true,
				tribes: [],
				heightEnabled: true,
				height: [121, 241],
			}),
		);

		expect(compiled.active).toBe(false);
	});

	it("leaves out the photo filters only the server can answer", () => {
		const compiled = compileFilters(
			filtersWith({
				photosEnabled: true,
				photos: ["has-face-pics", "has-albums"],
			}),
		);

		expect(compiled.active).toBe(false);
	});
});

describe("filters answered by the short lookup", () => {
	it("wants only the live facts, and says unknown until they arrive", () => {
		const compiled = compileFilters(filtersWith({ isOnline: true }));

		expect(compiled.needs).toEqual({ live: true, details: false });
		expect(compiled.verdict(undefined, NOW)).toBe("unknown");
		expect(compiled.verdict({}, NOW)).toBe("unknown");
	});

	it("online: only while the online time is still ahead", () => {
		expect(
			verdict(
				{ isOnline: true },
				facts(live({ onlineUntil: NOW + MINUTE })),
			),
		).toBe("match");
		expect(
			verdict(
				{ isOnline: true },
				facts(live({ onlineUntil: NOW - MINUTE })),
			),
		).toBe("no");
		expect(verdict({ isOnline: true }, facts(live()))).toBe("no");
	});

	it("favorites, right now and new profiles", () => {
		expect(
			verdict({ isFavorite: true }, facts(live({ isFavorite: true }))),
		).toBe("match");
		expect(verdict({ isFavorite: true }, facts(live()))).toBe("no");
		expect(
			verdict({ isRightNow: true }, facts(live({ rightNow: true }))),
		).toBe("match");
		expect(verdict({ isRightNow: true }, facts(live()))).toBe("no");
		expect(verdict({ isFresh: true }, facts(live({ isNew: true })))).toBe(
			"match",
		);
		expect(verdict({ isFresh: true }, facts(live()))).toBe("no");
	});

	it("haven't chatted today: never chatted or not in the last 24 hours", () => {
		const filters = { haventChattedTodayEnabled: true };

		expect(verdict(filters, facts(live()))).toBe("match");
		expect(
			verdict(
				filters,
				facts(live({ lastChatTimestamp: NOW - 25 * HOUR })),
			),
		).toBe("match");
		expect(
			verdict(filters, facts(live({ lastChatTimestamp: NOW - HOUR }))),
		).toBe("no");
	});

	it("age: inside the range, with no limit at either end of the slider", () => {
		const bounded = { ageEnabled: true, age: [25, 35] };
		expect(verdict(bounded, facts(live({ age: 25 })))).toBe("match");
		expect(verdict(bounded, facts(live({ age: 35 })))).toBe("match");
		expect(verdict(bounded, facts(live({ age: 24 })))).toBe("no");
		expect(verdict(bounded, facts(live({ age: 36 })))).toBe("no");

		const andOver = { ageEnabled: true, age: [40, 99] };
		expect(verdict(andOver, facts(live({ age: 80 })))).toBe("match");
		expect(verdict(andOver, facts(live({ age: 39 })))).toBe("no");
	});

	it("age: a profile that hides its age does not match", () => {
		expect(
			verdict(
				{ ageEnabled: true, age: [25, 35] },
				facts(live({ age: null })),
			),
		).toBe("no");
	});

	it("has photos", () => {
		const filters = {
			photosEnabled: true,
			photos: ["has-photos" as const],
		};

		expect(verdict(filters, facts(live({ hasPhotos: true })))).toBe(
			"match",
		);
		expect(verdict(filters, facts(live({ hasPhotos: false })))).toBe("no");
	});

	it("needs every filter that is on: all of them must say yes", () => {
		const filters = { isOnline: true, isFavorite: true };
		const online = live({ onlineUntil: NOW + MINUTE });

		expect(verdict(filters, facts({ ...online, isFavorite: true }))).toBe(
			"match",
		);
		expect(verdict(filters, facts(online))).toBe("no");
	});
});

describe("filters answered by the full profile", () => {
	it("wants the details, and says unknown until they arrive", () => {
		const compiled = compileFilters(
			filtersWith({ tribesEnabled: true, tribes: [2] }),
		);

		expect(compiled.needs).toEqual({ live: false, details: true });
		expect(compiled.verdict(undefined, NOW)).toBe("unknown");
		expect(compiled.verdict(facts(live()), NOW)).toBe("unknown");
	});

	it("says no for a profile that cannot be fetched", () => {
		expect(
			verdict({ tribesEnabled: true, tribes: [2] }, facts(live(), null)),
		).toBe("no");
	});

	it("matches a list of choices when the profile has any of them", () => {
		const filters = { tribesEnabled: true, tribes: [2, 12] };

		expect(
			verdict(filters, facts(live(), details({ tribes: [5, 12] }))),
		).toBe("match");
		expect(verdict(filters, facts(live(), details({ tribes: [5] })))).toBe(
			"no",
		);
	});

	it("takes 'not specified' to mean the profile has said nothing", () => {
		const filters = { tribesEnabled: true, tribes: [-1] };

		expect(verdict(filters, facts(live(), details({ tribes: [] })))).toBe(
			"match",
		);
		expect(verdict(filters, facts(live(), details({ tribes: [3] })))).toBe(
			"no",
		);

		const body = { bodyTypesEnabled: true, bodyTypes: [-1, 2] };
		expect(verdict(body, facts(live(), details({ bodyType: null })))).toBe(
			"match",
		);
		expect(verdict(body, facts(live(), details({ bodyType: 2 })))).toBe(
			"match",
		);
		expect(verdict(body, facts(live(), details({ bodyType: 4 })))).toBe(
			"no",
		);
	});

	it("single choices: body type, relationship, pictures, position", () => {
		expect(
			verdict(
				{
					relationshipStatusesEnabled: true,
					relationshipStatuses: [2],
				},
				facts(live(), details({ relationshipStatus: 2 })),
			),
		).toBe("match");
		expect(
			verdict(
				{ acceptNSFWPicsEnabled: true, acceptNSFWPics: [1] },
				facts(live(), details({ nsfw: 3 })),
			),
		).toBe("no");
		expect(
			verdict(
				{ positionEnabled: true, positions: [1] },
				facts(live(), details({ sexualPosition: 1 })),
			),
		).toBe("match");
	});

	it("position: falls back to what the short lookup said", () => {
		const filters = { positionEnabled: true, positions: [3] };

		expect(
			verdict(
				filters,
				facts(
					live({ sexualPosition: 3 }),
					details({ sexualPosition: null }),
				),
			),
		).toBe("match");
	});

	it("lists a profile can have several of: looking for, meet at, health", () => {
		expect(
			verdict(
				{ lookingForEnabled: true, lookingFor: [3] },
				facts(live(), details({ lookingFor: [2, 3] })),
			),
		).toBe("match");
		expect(
			verdict(
				{ meetAtEnabled: true, meetAt: [1] },
				facts(live(), details({ meetAt: [] })),
			),
		).toBe("no");
		expect(
			verdict(
				{ healthPracticesEnabled: true, healthPractices: [3] },
				facts(live(), details({ sexualHealth: [3] })),
			),
		).toBe("match");
	});

	it("genders", () => {
		const filters = { genderEnabled: true, genders: [1, 2] };

		expect(verdict(filters, facts(live(), details({ genders: [2] })))).toBe(
			"match",
		);
		expect(verdict(filters, facts(live(), details({ genders: [7] })))).toBe(
			"no",
		);
	});

	it("tags, whatever the case", () => {
		const filters = { tagsEnabled: true, tags: ["Bears", "gym"] };

		expect(
			verdict(
				filters,
				facts(live(), details({ tags: ["GYM", "music"] })),
			),
		).toBe("match");
		expect(
			verdict(filters, facts(live(), details({ tags: ["music"] }))),
		).toBe("no");
	});

	it("height in centimeters, with no limit at either end", () => {
		const filters = { heightEnabled: true, height: [170, 241] };

		expect(verdict(filters, facts(live(), details({ height: 170 })))).toBe(
			"match",
		);
		expect(verdict(filters, facts(live(), details({ height: 200 })))).toBe(
			"match",
		);
		expect(verdict(filters, facts(live(), details({ height: 169 })))).toBe(
			"no",
		);
		expect(verdict(filters, facts(live(), details({ height: null })))).toBe(
			"no",
		);
	});

	it("weight: profiles carry grams, the filter speaks kilograms", () => {
		const filters = { weightEnabled: true, weight: [70, 90] };

		expect(
			verdict(filters, facts(live(), details({ weight: 80_000 }))),
		).toBe("match");
		expect(
			verdict(filters, facts(live(), details({ weight: 95_000 }))),
		).toBe("no");
	});
});

describe("mixing both kinds", () => {
	const filters = { isOnline: true, tribesEnabled: true, tribes: [2] };
	const online = live({ onlineUntil: NOW + MINUTE });

	it("says no at once when what is known already says no", () => {
		// Offline: no need to wait for the full profile.
		expect(verdict(filters, facts(live(), undefined))).toBe("no");
		// Online, wrong tribe.
		expect(verdict(filters, facts(online, details({ tribes: [5] })))).toBe(
			"no",
		);
	});

	it("says unknown while the part that could say yes is still missing", () => {
		expect(verdict(filters, facts(online, undefined))).toBe("unknown");
		expect(
			verdict(filters, facts(undefined, details({ tribes: [2] }))),
		).toBe("unknown");
	});

	it("says match once both parts agree", () => {
		expect(verdict(filters, facts(online, details({ tribes: [2] })))).toBe(
			"match",
		);
	});
});
