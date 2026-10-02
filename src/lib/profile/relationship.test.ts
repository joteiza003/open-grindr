import { describe, expect, it } from "vitest";

import type { UsageEvent } from "$lib/stats/events";
import { relationshipSummary, relativeTime } from "./relationship";

const events: UsageEvent[] = [
	{ t: 100, k: "out", c: "1:2" },
	{ t: 200, k: "in", c: "1:2" },
	{ t: 300, k: "out", c: "1:2" },
	{ t: 150, k: "in", c: "9:10" },
	{ t: 50, k: "like", c: 2 },
	{ t: 250, k: "superlike", c: 2 },
	{ t: 260, k: "hide", c: 3 },
];

describe("relationshipSummary", () => {
	const summary = relationshipSummary(events, {
		conversationId: "1:2",
		profileId: 2,
	});

	it("counts messages in the conversation only", () => {
		expect(summary.messagesOut).toBe(2);
		expect(summary.messagesIn).toBe(1);
		expect(summary.firstAt).toBe(100);
		expect(summary.lastAt).toBe(300);
		expect(summary.startedByMe).toBe(true);
	});

	it("keeps the latest deck decision for that profile", () => {
		expect(summary.decision).toEqual({ kind: "superlike", at: 250 });
	});

	it("is empty for a stranger", () => {
		const none = relationshipSummary(events, {
			conversationId: "5:6",
			profileId: 6,
		});
		expect(none.messagesIn + none.messagesOut).toBe(0);
		expect(none.decision).toBeNull();
		expect(none.startedByMe).toBeNull();
	});
});

describe("relativeTime", () => {
	it("speaks in the requested unit", () => {
		const now = 10 * 24 * 3600_000;
		expect(relativeTime(now - 3 * 24 * 3600_000, now, "en")).toBe(
			"3 days ago",
		);
		expect(relativeTime(now - 2 * 3600_000, now, "en")).toBe("2 hours ago");
	});
});
