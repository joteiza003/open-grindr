import { describe, expect, it } from "vitest";

import { conversationStats } from "./conversation-stats";
import type { UsageEvent } from "./events";

const NOW = new Date(2026, 9, 1, 12, 0).getTime();
const MIN = 60_000;
const ev = (k: UsageEvent["k"], c: string, minutesAgo: number): UsageEvent => ({
	t: NOW - minutesAgo * MIN,
	k,
	c,
});

describe("conversationStats", () => {
	const events: UsageEvent[] = [
		ev("out", "1:7", 100),
		ev("in", "1:7", 90),
		ev("out", "1:7", 80),
		ev("in", "other", 70),
		ev("like", "1:7", 60),
	];

	it("counts only that conversation's messages", () => {
		const stats = conversationStats(events, {
			conversationId: "1:7",
			now: NOW,
		});
		expect(stats.sent).toBe(2);
		expect(stats.received).toBe(1);
		expect(stats.medianReplyMs).toBe(10 * MIN);
	});

	it("says who started and when", () => {
		const stats = conversationStats(events, {
			conversationId: "1:7",
			now: NOW,
		});
		expect(stats.startedByMe).toBe(true);
		expect(stats.firstAt).toBe(NOW - 100 * MIN);
	});

	it("handles a conversation with no recorded messages", () => {
		const stats = conversationStats(events, {
			conversationId: "none",
			now: NOW,
		});
		expect(stats.hasData).toBe(false);
		expect(stats.startedByMe).toBeNull();
		expect(stats.firstAt).toBeNull();
	});
});
