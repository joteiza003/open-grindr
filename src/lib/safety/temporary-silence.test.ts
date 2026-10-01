import { describe, expect, it } from "vitest";

import {
	activeHiddenIds,
	addSilence,
	durationMs,
	findSilence,
	removeSilence,
	type SilenceEntry,
	splitExpired,
} from "./temporary-silence";

const NOW = 1_000_000;
const hide = (profileId: number, until: number): SilenceEntry => ({
	profileId,
	kind: "hide",
	until,
});
const mute = (profileId: number, until: number): SilenceEntry => ({
	profileId,
	kind: "mute",
	until,
	conversationId: `1:${profileId}`,
});

describe("addSilence", () => {
	it("keeps one entry per profile and kind, renewing the old one", () => {
		const list = addSilence([hide(7, 10), mute(7, 20)], hide(7, 99));
		expect(list).toHaveLength(2);
		expect(list.find((e) => e.kind === "hide")?.until).toBe(99);
		expect(list.find((e) => e.kind === "mute")?.until).toBe(20);
	});

	it("drops the entries that end soonest beyond the cap", () => {
		const list = addSilence([hide(1, 10), hide(2, 20)], hide(3, 30), 2);
		expect(list.map((e) => e.profileId).toSorted()).toEqual([2, 3]);
	});
});

describe("findSilence / activeHiddenIds / splitExpired", () => {
	const entries = [hide(1, NOW + 5), hide(2, NOW - 5), mute(3, NOW + 5)];

	it("only counts silences that have not ended", () => {
		expect(
			findSilence(entries, { profileId: 1, kind: "hide" }, NOW),
		).not.toBeNull();
		expect(
			findSilence(entries, { profileId: 2, kind: "hide" }, NOW),
		).toBeNull();
		expect([...activeHiddenIds(entries, NOW)]).toEqual([1]);
	});

	it("separates the expired ones", () => {
		const { active, expired } = splitExpired(entries, NOW);
		expect(active.map((e) => e.profileId)).toEqual([1, 3]);
		expect(expired.map((e) => e.profileId)).toEqual([2]);
	});
});

describe("removeSilence / durationMs", () => {
	it("removes only the matching kind", () => {
		const list = removeSilence([hide(1, 5), mute(1, 5)], {
			profileId: 1,
			kind: "hide",
		});
		expect(list).toEqual([mute(1, 5)]);
	});

	it("maps duration ids to milliseconds", () => {
		expect(durationMs("1h")).toBe(3_600_000);
		expect(durationMs("7d")).toBe(7 * 24 * 3_600_000);
	});
});
