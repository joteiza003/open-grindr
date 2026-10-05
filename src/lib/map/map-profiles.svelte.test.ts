// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MapProfilesState } from "./map-profiles.svelte";
import type { DetailFacts, LiveFacts } from "./profile-facts";
import type { ProfilesBackend } from "./profiles-backend";

const T0 = 1_800_000_000_000;
const MINUTE = 60_000;

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

/** A backend whose answers the test hands out when it chooses. */
function fakeBackend() {
	const known = new Map<number, LiveFacts>();
	const lookups: number[][] = [];
	const waiting = new Map<number, (value: DetailFacts | null) => void>();
	const failing = new Set<number>();
	let lookupFails = false;
	const backend: ProfilesBackend = {
		lookup: vi.fn((ids: number[]) => {
			lookups.push(ids);
			if (lookupFails) return Promise.reject(new Error("offline"));
			return Promise.resolve(
				new Map(
					ids
						.filter((id) => known.has(id))
						.map((id): [number, LiveFacts] => [id, known.get(id)!]),
				),
			);
		}),
		details: vi.fn(
			(id: number) =>
				new Promise<DetailFacts | null>((resolve, reject) => {
					if (failing.has(id)) reject(new Error("boom"));
					else waiting.set(id, resolve);
				}),
		),
	};
	return {
		backend,
		known,
		lookups,
		waiting,
		failing,
		failLookups: (fails: boolean) => (lookupFails = fails),
		answer: (id: number, value: DetailFacts | null) => {
			waiting.get(id)?.(value);
			waiting.delete(id);
		},
	};
}

function setup() {
	const fake = fakeBackend();
	const profiles = new MapProfilesState({
		backend: fake.backend,
		clock: () => Date.now(),
	});
	return { ...fake, profiles };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

let hidden = false;
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(T0);
	hidden = false;
	Object.defineProperty(document, "hidden", {
		configurable: true,
		get: () => hidden,
	});
});
afterEach(() => {
	vi.useRealTimers();
	delete (document as { hidden?: boolean }).hidden;
});

describe("who is online", () => {
	it("is looked up once the map is open, for every profile it was told about", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live({ onlineUntil: T0 + 5 * MINUTE }));
		known.set(3, live());
		profiles.track([7, 3, 7], { details: false });

		profiles.start();
		await settle();

		expect(lookups).toEqual([[3, 7]]);
		expect(profiles.lookup).toBe("ready");
		expect(profiles.isOnline(7)).toBe(true);
		expect(profiles.isOnline(3)).toBe(false);
		expect(profiles.isOnline(99)).toBe(false);
		profiles.stop();
	});

	it("asks for nothing before it is started or when there is nobody to ask about", async () => {
		const { profiles, lookups } = setup();

		profiles.track([7], { details: false });
		await settle();
		expect(lookups).toEqual([]);

		profiles.stop();
		const idle = setup();
		idle.profiles.start();
		await settle();
		expect(idle.lookups).toEqual([]);
		idle.profiles.stop();
	});

	it("asks again every minute", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live({ onlineUntil: T0 + 2 * MINUTE }));
		profiles.track([7], { details: false });
		profiles.start();
		await settle();

		known.set(7, live({ onlineUntil: T0 + 10 * MINUTE }));
		await vi.advanceTimersByTimeAsync(MINUTE);

		expect(lookups).toHaveLength(2);
		expect(profiles.facts.get(7)?.live?.onlineUntil).toBe(T0 + 10 * MINUTE);
		profiles.stop();
	});

	it("shares a lookup that is already on its way", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live());
		profiles.track([7], { details: false });
		profiles.start();

		void profiles.refreshLive();
		void profiles.refreshLive();
		await settle();

		expect(lookups).toHaveLength(1);
		profiles.stop();
	});

	it("looks the new profile up as soon as one is added", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live());
		known.set(8, live());
		profiles.track([7], { details: false });
		profiles.start();
		await settle();

		profiles.track([7, 8], { details: false });
		await settle();

		expect(lookups).toEqual([[7], [7, 8]]);
		expect(profiles.facts.has(8)).toBe(true);
		profiles.stop();
	});

	it("does nothing when told the same thing again", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live());
		profiles.track([7], { details: false });
		profiles.start();
		await settle();

		profiles.track([7], { details: false });
		await settle();

		expect(lookups).toHaveLength(1);
		profiles.stop();
	});

	it("keeps what it knew when a lookup fails, and says so", async () => {
		const { profiles, known, failLookups } = setup();
		known.set(7, live({ onlineUntil: T0 + 30 * MINUTE }));
		profiles.track([7], { details: false });
		profiles.start();
		await settle();

		failLookups(true);
		await vi.advanceTimersByTimeAsync(MINUTE);

		expect(profiles.lookup).toBe("failed");
		expect(profiles.isOnline(7)).toBe(true);

		failLookups(false);
		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(profiles.lookup).toBe("ready");
		profiles.stop();
	});

	it("leaves out profiles the server does not return", async () => {
		const { profiles, known } = setup();
		known.set(7, live());
		profiles.track([7, 8], { details: false });
		profiles.start();
		await settle();

		expect(profiles.facts.has(7)).toBe(true);
		expect(profiles.facts.has(8)).toBe(false);
		expect(profiles.isOnline(8)).toBe(false);
		profiles.stop();
	});

	it("does not ask while the app is out of sight, and asks when it is back", async () => {
		const { profiles, known, lookups } = setup();
		known.set(7, live());
		profiles.track([7], { details: false });
		hidden = true;
		profiles.start();
		await vi.advanceTimersByTimeAsync(3 * MINUTE);
		expect(lookups).toEqual([]);

		hidden = false;
		document.dispatchEvent(new Event("visibilitychange"));
		await settle();

		expect(lookups).toHaveLength(1);
		profiles.stop();
	});

	it("moves its clock on, so a profile stops being online when its time runs out", async () => {
		const { profiles, known } = setup();
		known.set(7, live({ onlineUntil: T0 + 4 * MINUTE }));
		profiles.track([7], { details: false });
		profiles.start();
		await settle();
		expect(profiles.isOnline(7)).toBe(true);

		// The lookup at 1, 2, 3 and 4 minutes brings the same answer; the clock
		// alone decides.
		await vi.advanceTimersByTimeAsync(5 * MINUTE);

		expect(profiles.isOnline(7)).toBe(false);
		profiles.stop();
	});
});

describe("full profiles, for the filters", () => {
	it("are not asked for unless wanted", async () => {
		const { profiles, known, backend } = setup();
		known.set(7, live());
		profiles.track([7], { details: false });
		profiles.start();
		await settle();

		expect(backend.details).not.toHaveBeenCalled();
		expect(profiles.detailsPending).toBe(0);
		profiles.stop();
	});

	it("are asked for a couple at a time, and fill in as they arrive", async () => {
		const { profiles, known, backend, answer } = setup();
		for (const id of [1, 2, 3]) known.set(id, live());
		profiles.track([1, 2, 3], { details: true });
		profiles.start();
		await settle();

		expect(backend.details).toHaveBeenCalledTimes(2);
		expect(profiles.detailsPending).toBe(3);
		expect(profiles.pending).toBe(true);

		answer(1, details({ tribes: [2] }));
		await settle();
		expect(backend.details).toHaveBeenCalledTimes(3);
		expect(profiles.facts.get(1)?.details?.tribes).toEqual([2]);
		expect(profiles.detailsPending).toBe(2);

		answer(2, details());
		answer(3, details());
		await settle();
		expect(profiles.detailsPending).toBe(0);
		expect(profiles.pending).toBe(false);
		profiles.stop();
	});

	it("start being asked for as soon as a filter needs them", async () => {
		const { profiles, known, backend } = setup();
		known.set(1, live());
		profiles.track([1], { details: false });
		profiles.start();
		await settle();

		profiles.track([1], { details: true });
		await settle();

		expect(backend.details).toHaveBeenCalledWith(1);
		profiles.stop();
	});

	it("are not asked for twice while they are fresh", async () => {
		const { profiles, known, backend, answer } = setup();
		known.set(1, live());
		profiles.track([1], { details: true });
		profiles.start();
		await settle();
		answer(1, details());
		await vi.advanceTimersByTimeAsync(5 * MINUTE);

		expect(backend.details).toHaveBeenCalledTimes(1);
		profiles.stop();
	});

	it("keep a profile that cannot be fetched as unavailable, and try it again later", async () => {
		const { profiles, known, backend, answer } = setup();
		known.set(1, live());
		profiles.track([1], { details: true });
		profiles.start();
		await settle();

		answer(1, null);
		await settle();
		expect(profiles.facts.get(1)?.details).toBeNull();
		expect(backend.details).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(3 * MINUTE);
		expect(backend.details).toHaveBeenCalledTimes(2);
		profiles.stop();
	});

	it("treat a failed request as unavailable, not as a reason to stop", async () => {
		const { profiles, known, failing, backend, answer } = setup();
		for (const id of [1, 2]) known.set(id, live());
		failing.add(1);
		profiles.track([1, 2], { details: true });
		profiles.start();
		await settle();

		expect(profiles.facts.get(1)?.details).toBeNull();
		answer(2, details());
		await settle();
		expect(profiles.facts.get(2)?.details).not.toBeNull();
		expect(backend.details).toHaveBeenCalledTimes(2);
		profiles.stop();
	});
});

describe("stopping", () => {
	it("drops answers that arrive afterwards and stops asking", async () => {
		const { profiles, known, lookups, backend, answer } = setup();
		known.set(1, live());
		profiles.track([1], { details: true });
		profiles.start();
		await settle();

		profiles.stop();
		answer(1, details());
		await vi.advanceTimersByTimeAsync(5 * MINUTE);

		expect(profiles.facts.get(1)?.details).toBeUndefined();
		expect(lookups).toHaveLength(1);
		expect(backend.details).toHaveBeenCalledTimes(1);
		expect(profiles.lookup).toBe("idle");
		expect(profiles.detailsPending).toBe(0);
	});

	it("can be stopped twice, and started again", async () => {
		const { profiles, known, lookups } = setup();
		known.set(1, live());
		profiles.track([1], { details: false });
		profiles.start();
		await settle();

		profiles.stop();
		profiles.stop();
		profiles.start();
		await settle();

		expect(lookups).toHaveLength(2);
		profiles.stop();
	});
});
