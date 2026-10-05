import { describe, expect, it } from "vitest";

import { computeUsageStats } from "./compute";
import type { UsageEvent } from "./events";

const MIN = 60_000;
const NOW = new Date(2026, 9, 1, 12, 0, 0).getTime();
const at = (minutesAgo: number) => NOW - minutesAgo * MIN;

describe("computeUsageStats", () => {
	it("reports an empty period", () => {
		const stats = computeUsageStats([], { now: NOW, days: 7 });
		expect(stats.hasData).toBe(false);
		expect(stats.replyRate).toBeNull();
		expect(stats.medianReplyMs).toBeNull();
		expect(stats.busiestHour).toBeNull();
	});

	it("ignores events outside the period", () => {
		const events: UsageEvent[] = [
			{ t: at(60 * 24 * 8), k: "out", c: "a" },
			{ t: at(5), k: "out", c: "b" },
		];
		const stats = computeUsageStats(events, { now: NOW, days: 7 });
		expect(stats.sent).toBe(1);
	});

	it("measures reply rate and median reply time", () => {
		const events: UsageEvent[] = [
			{ t: at(100), k: "in", c: "a" },
			{ t: at(90), k: "out", c: "a" }, // 10 min
			{ t: at(80), k: "in", c: "b" },
			{ t: at(50), k: "out", c: "b" }, // 30 min
			{ t: at(40), k: "in", c: "c" }, // never answered
		];
		const stats = computeUsageStats(events, { now: NOW, days: 7 });
		expect(stats.incomingThreads).toBe(3);
		expect(stats.repliedThreads).toBe(2);
		expect(stats.replyRate).toBeCloseTo(2 / 3);
		expect(stats.medianReplyMs).toBe(20 * MIN);
	});

	it("counts a burst of incoming messages as one pending turn", () => {
		const events: UsageEvent[] = [
			{ t: at(30), k: "in", c: "a" },
			{ t: at(29), k: "in", c: "a" },
			{ t: at(20), k: "out", c: "a" },
		];
		const stats = computeUsageStats(events, { now: NOW, days: 7 });
		expect(stats.incomingThreads).toBe(1);
		expect(stats.medianReplyMs).toBe(10 * MIN);
	});

	it("counts conversations you started", () => {
		const events: UsageEvent[] = [
			{ t: at(30), k: "out", c: "a" },
			{ t: at(25), k: "out", c: "a" },
			{ t: at(20), k: "in", c: "b" },
			{ t: at(10), k: "out", c: "b" },
		];
		const stats = computeUsageStats(events, { now: NOW, days: 7 });
		expect(stats.conversationsStarted).toBe(1);
	});

	it("finds the busiest hour and sums sessions and deck decisions", () => {
		const events: UsageEvent[] = [
			{ t: new Date(2026, 9, 1, 9, 5).getTime(), k: "out", c: "a" },
			{ t: new Date(2026, 9, 1, 9, 30).getTime(), k: "in", c: "a" },
			{ t: new Date(2026, 9, 1, 8, 0).getTime(), k: "out", c: "b" },
			{ t: at(30), k: "session", d: 120 },
			{ t: at(20), k: "session", d: 60 },
			{ t: at(10), k: "like", c: 1 },
			{ t: at(9), k: "hide", c: 2 },
			{ t: at(8), k: "hide", c: 3 },
		];
		const stats = computeUsageStats(events, { now: NOW, days: 7 });
		expect(stats.busiestHour).toBe(9);
		expect(stats.sessions).toBe(2);
		expect(stats.activeSeconds).toBe(180);
		expect(stats.deck.like).toBe(1);
		expect(stats.deck.hide).toBe(2);
	});
});
