import { describe, expect, it } from "vitest";

import type { ApiResponseMessage } from "$lib/model/messaging/messages";
import type { CachedConversation } from "./cached-conversation";
import {
	normalizeForSearch,
	type SearchableConversation,
	searchMessages,
	splitAroundMatch,
} from "./message-search";

function text(id: string, body: string, timestamp: number) {
	return {
		type: "Text",
		messageId: id,
		conversationId: "c1",
		senderId: 1,
		timestamp,
		body: { text: body },
	} as unknown as ApiResponseMessage;
}

function other(id: string, type: string, timestamp: number) {
	return {
		type,
		messageId: id,
		conversationId: "c1",
		senderId: 1,
		timestamp,
		body: {},
	} as unknown as ApiResponseMessage;
}

const conversations: SearchableConversation[] = [
	{
		conversationId: "c1",
		name: "Ane",
		preview: { type: "Text", text: "ultimo" },
		lastActivityTimestamp: 100,
	},
	{
		conversationId: "c2",
		name: "Iker",
		preview: { type: "Text", text: "Quedamos en el Café" },
		lastActivityTimestamp: 50,
	},
];

const cached: Record<string, CachedConversation> = {
	c1: {
		messages: [
			text("m1", "Hola, mira https://example.com/foto", 90),
			text("m2", "Nos vemos mañana", 80),
			other("m3", "Image", 70),
			other("m4", "Location", 60),
			other("m5", "Unsent", 55),
		],
		profile: {
			distance: null,
			mediaHash: null,
			name: "Ane",
			onlineUntil: null,
			profileId: 1,
			showDistance: false,
		},
		pageKey: null,
		lastReadTimestamp: null,
	},
};

const base = { conversations, getCached: (id: string) => cached[id] };

describe("normalizeForSearch", () => {
	it("ignores case and accents", () => {
		expect(normalizeForSearch("Café MAÑANA")).toBe("cafe manana");
	});
});

describe("searchMessages", () => {
	it("finds nothing without a query or a filter", () => {
		expect(searchMessages({ ...base, query: "  " })).toEqual([]);
	});

	it("matches loaded messages and the preview of unloaded chats", () => {
		const results = searchMessages({ ...base, query: "cafe" });
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			conversationId: "c2",
			fromPreview: true,
		});
		const loaded = searchMessages({ ...base, query: "manana" });
		expect(loaded[0]).toMatchObject({
			messageId: "m2",
			fromPreview: false,
		});
	});

	it("does not use the preview of a chat whose history is loaded", () => {
		expect(searchMessages({ ...base, query: "ultimo" })).toEqual([]);
	});

	it("orders newest first", () => {
		const results = searchMessages({ ...base, query: "o" });
		const stamps = results.map((result) => result.timestamp);
		expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
	});

	it("filters by kind even without a query", () => {
		expect(
			searchMessages({ ...base, query: "", kind: "media" }).map(
				(r) => r.messageId,
			),
		).toEqual(["m3"]);
		expect(
			searchMessages({ ...base, query: "", kind: "location" }).map(
				(r) => r.messageId,
			),
		).toEqual(["m4"]);
		expect(
			searchMessages({ ...base, query: "", kind: "link" }).map(
				(r) => r.messageId,
			),
		).toEqual(["m1"]);
	});

	it("never returns unsent messages and can be limited to a conversation", () => {
		const all = searchMessages({ ...base, query: "", kind: "text" });
		expect(all.every((result) => result.kind !== "other")).toBe(true);
		const scoped = searchMessages({
			...base,
			query: "e",
			conversationId: "c2",
		});
		expect(scoped.every((result) => result.conversationId === "c2")).toBe(
			true,
		);
	});
});

describe("splitAroundMatch", () => {
	it("splits the text around the match, ignoring accents", () => {
		expect(
			splitAroundMatch({ text: "Quedamos en el Café", query: "cafe" }),
		).toEqual({ before: "Quedamos en el ", match: "Café", after: "" });
	});

	it("shortens long context with ellipses", () => {
		const result = splitAroundMatch({
			text: "a".repeat(100) + "XX" + "b".repeat(100),
			query: "xx",
			context: 5,
		});
		expect(result.before).toBe("…aaaaa");
		expect(result.after).toBe("bbbbb…");
	});

	it("returns the plain start when nothing matches", () => {
		expect(splitAroundMatch({ text: "hola", query: "zzz" }).match).toBe("");
	});
});
