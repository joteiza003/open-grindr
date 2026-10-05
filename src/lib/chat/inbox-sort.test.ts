import { describe, expect, it } from "vitest";

import { type SortableConversation, sortInbox } from "./inbox-sort";

const NOW = 1_000_000;

function conv(
	id: string,
	overrides: Partial<SortableConversation["data"]> = {},
): SortableConversation {
	return {
		data: {
			conversationId: id,
			pinned: false,
			unreadCount: 0,
			onlineUntil: null,
			participants: [],
			...overrides,
		},
	};
}

const ids = (list: SortableConversation[]) =>
	list.map((entry) => entry.data.conversationId);

describe("sortInbox", () => {
	const entries = [
		conv("a"),
		conv("b", { unreadCount: 2 }),
		conv("c", { onlineUntil: NOW + 1000 }),
		conv("d", { pinned: true }),
		conv("e", { participants: [{ onlineUntil: NOW + 1000 }] }),
	];
	const base = { markedUnread: new Set<string>(), now: NOW };

	it("keeps the given order for recent", () => {
		expect(ids(sortInbox(entries, { ...base, sort: "recent" }))).toEqual([
			"a",
			"b",
			"c",
			"d",
			"e",
		]);
	});

	it("puts unread first but pinned chats stay on top", () => {
		expect(ids(sortInbox(entries, { ...base, sort: "unread" }))).toEqual([
			"d",
			"b",
			"a",
			"c",
			"e",
		]);
	});

	it("counts a chat marked as unread", () => {
		const marked = new Set(["e"]);
		expect(
			ids(
				sortInbox(entries, {
					sort: "unread",
					markedUnread: marked,
					now: NOW,
				}),
			),
		).toEqual(["d", "b", "e", "a", "c"]);
	});

	it("puts online chats first, including the participant's own presence", () => {
		expect(ids(sortInbox(entries, { ...base, sort: "online" }))).toEqual([
			"d",
			"c",
			"e",
			"a",
			"b",
		]);
	});
});
