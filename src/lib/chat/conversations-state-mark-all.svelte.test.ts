import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConversationsMock, markConversationAsReadMock, showErrorToastMock } =
	vi.hoisted(() => ({
		getConversationsMock: vi.fn(),
		markConversationAsReadMock: vi.fn<
			(args: { conversationId: string }) => Promise<void>
		>(() => Promise.resolve()),
		showErrorToastMock: vi.fn(),
	}));

vi.mock("$app/state", () => ({ page: { route: { id: "/(protected)/chat" } } }));
vi.mock("$lib/api/error-toast", () => ({ showErrorToast: showErrorToastMock }));
vi.mock("$lib/api/messaging/conversations", () => ({
	getConversations: getConversationsMock,
	markConversationAsRead: markConversationAsReadMock,
	deleteConversationForMe: vi.fn(() => Promise.resolve()),
	setConversationPinned: vi.fn(() => Promise.resolve()),
	setConversationMuted: vi.fn(() => Promise.resolve()),
}));
vi.mock("$lib/util/breakpoints.svelte", () => ({
	below: () => ({ current: false }),
}));
vi.mock("$lib/util/reconcile", () => ({
	reconciler: { subscribe: () => vi.fn() },
}));
vi.mock("$lib/ws.svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/ws.svelte")>()),
	ws: { on: () => Promise.resolve(vi.fn()) },
}));

import { ConversationsState } from "./conversations-state.svelte";
import {
	conversation,
	entryFor,
	OUR_ID,
	settled,
} from "./conversations-test-helpers";
import { markAllConversationsRead } from "./mark-all-conversations";

const onIncomingMessage = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	markConversationAsReadMock.mockImplementation(() => Promise.resolve());
});

describe("ConversationsState markAllRead", () => {
	it("marks every unread conversation as read, including ones that were not loaded", async () => {
		getConversationsMock.mockImplementation(
			({ filters }: { filters?: { unreadOnly?: boolean } | null }) =>
				Promise.resolve(
					filters?.unreadOnly
						? {
								entries: [
									conversation("a:1", 1000, {
										unreadCount: 2,
									}),
									conversation("z:9", 500, {
										unreadCount: 5,
									}),
								],
								nextPage: null,
							}
						: {
								entries: [
									conversation("a:1", 1000, {
										unreadCount: 2,
									}),
									conversation("b:2", 2000, {
										unreadCount: 0,
									}),
								],
								nextPage: 2,
							},
				),
		);
		const state = new ConversationsState({
			ourProfileId: OUR_ID,
			onIncomingMessage,
		});
		await settled(state);
		markConversationAsReadMock.mockClear();

		const result = await markAllConversationsRead(state.entries);

		expect(result).toEqual({ marked: 2, failed: 0, listFailed: false });
		expect(
			markConversationAsReadMock.mock.calls
				.map(([args]) => args.conversationId)
				.toSorted(),
		).toEqual(["a:1", "z:9"]);
		expect(entryFor(state, "a:1").data.unreadCount).toBe(0);
		expect(entryFor(state, "a:1").data.unreadCount).toBe(0);
	});

	it("restores the unread count of a conversation that fails and reports one error", async () => {
		getConversationsMock.mockResolvedValue({
			entries: [
				conversation("a:1", 1000, { unreadCount: 3 }),
				conversation("b:2", 2000, { unreadCount: 1 }),
			],
			nextPage: null,
		});
		const state = new ConversationsState({
			ourProfileId: OUR_ID,
			onIncomingMessage,
		});
		await settled(state);
		markConversationAsReadMock.mockClear();
		showErrorToastMock.mockClear();
		const failFirst = (args: { conversationId: string }) =>
			args.conversationId === "a:1"
				? Promise.reject(new Error("boom"))
				: Promise.resolve();
		markConversationAsReadMock.mockImplementation(failFirst);

		const result = await markAllConversationsRead(state.entries);

		expect(result.marked).toBe(1);
		expect(result.failed).toBe(1);
		expect(entryFor(state, "a:1").data.unreadCount).toBe(3);
		expect(entryFor(state, "b:2").data.unreadCount).toBe(0);
		expect(showErrorToastMock).toHaveBeenCalledTimes(1);
		markConversationAsReadMock.mockImplementation(() => Promise.resolve());
	});
});
