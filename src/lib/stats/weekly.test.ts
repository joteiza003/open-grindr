import { describe, expect, it } from "vitest";

import type { UsageEvent } from "./events";
import {
	isMonday,
	mondayKey,
	shouldShowWeekly,
	topConversation,
} from "./weekly";

// 2026-10-05 es lunes.
const MONDAY = new Date(2026, 9, 5, 9, 0);
const TUESDAY = new Date(2026, 9, 6, 9, 0);

describe("isMonday / mondayKey", () => {
	it("recognizes Mondays", () => {
		expect(isMonday(MONDAY)).toBe(true);
		expect(isMonday(TUESDAY)).toBe(false);
	});

	it("gives the same key for the whole week", () => {
		expect(mondayKey(MONDAY)).toBe("2026-10-05");
		expect(mondayKey(TUESDAY)).toBe("2026-10-05");
		expect(mondayKey(new Date(2026, 9, 11, 23, 0))).toBe("2026-10-05");
		expect(mondayKey(new Date(2026, 9, 12, 1, 0))).toBe("2026-10-12");
	});
});

describe("shouldShowWeekly", () => {
	it("shows only on Mondays, with data, and not once dismissed", () => {
		const base = { now: MONDAY, dismissedWeek: "", hasData: true };
		expect(shouldShowWeekly(base)).toBe(true);
		expect(shouldShowWeekly({ ...base, now: TUESDAY })).toBe(false);
		expect(shouldShowWeekly({ ...base, hasData: false })).toBe(false);
		expect(shouldShowWeekly({ ...base, dismissedWeek: "2026-10-05" })).toBe(
			false,
		);
		expect(shouldShowWeekly({ ...base, dismissedWeek: "2026-09-28" })).toBe(
			true,
		);
	});
});

describe("topConversation", () => {
	const now = MONDAY.getTime();
	const out = (c: string, minutesAgo: number): UsageEvent => ({
		t: now - minutesAgo * 60_000,
		k: "out",
		c,
	});

	it("finds the chat you wrote to most this week", () => {
		const events = [
			out("a", 10),
			out("b", 20),
			out("b", 30),
			out("a", 60 * 24 * 9),
		];
		expect(topConversation(events, { now, days: 7 })).toEqual({
			conversationId: "b",
			sent: 2,
		});
	});

	it("returns null when you sent nothing", () => {
		expect(
			topConversation([{ t: now, k: "in", c: "a" }], { now, days: 7 }),
		).toBeNull();
	});
});
