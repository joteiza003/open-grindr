import { describe, expect, it } from "vitest";

import {
	isStarred,
	type StarredMessage,
	starredIn,
	toggleStar,
} from "./starred";

const entry = (messageId: string, timestamp = 1, conversationId = "1:7") => ({
	conversationId,
	messageId,
	text: `texto ${messageId}`,
	timestamp,
	starredAt: 99,
});

describe("toggleStar", () => {
	it("stars a message and removes the star on a second toggle", () => {
		const once = toggleStar([], entry("m1"));
		expect(isStarred(once, "m1")).toBe(true);
		expect(toggleStar(once, entry("m1"))).toEqual([]);
	});

	it("trims long text", () => {
		const long = { ...entry("m1"), text: "x".repeat(500) };
		expect(toggleStar([], long)[0]?.text).toHaveLength(200);
	});

	it("drops the oldest star beyond the cap", () => {
		let list: StarredMessage[] = [];
		for (const id of ["a", "b", "c"]) list = toggleStar(list, entry(id), 2);
		expect(list.map((item) => item.messageId)).toEqual(["b", "c"]);
	});
});

describe("starredIn", () => {
	it("returns the conversation's stars, newest message first", () => {
		const list = [entry("a", 10), entry("b", 30), entry("c", 20, "other")];
		expect(starredIn(list, "1:7").map((item) => item.messageId)).toEqual([
			"b",
			"a",
		]);
	});
});
