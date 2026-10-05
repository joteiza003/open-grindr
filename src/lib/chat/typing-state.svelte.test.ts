import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TYPING_TIMEOUT_MS, typing } from "./typing-state.svelte";

const typingEvent = (status: string, profileId = 7) => ({
	conversationId: "1:7",
	profileId,
	status,
	ourProfileId: 1,
});

describe("typing state", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		typing.clear();
		vi.useRealTimers();
	});

	it("turns on with Typing and off with Cleared or Sent", () => {
		typing.apply(typingEvent("Typing"));
		expect(typing.isTyping("1:7")).toBe(true);
		typing.apply(typingEvent("Cleared"));
		expect(typing.isTyping("1:7")).toBe(false);
		typing.apply(typingEvent("Typing"));
		typing.apply(typingEvent("Sent"));
		expect(typing.isTyping("1:7")).toBe(false);
	});

	it("turns itself off if no further notice arrives", () => {
		typing.apply(typingEvent("Typing"));
		vi.advanceTimersByTime(TYPING_TIMEOUT_MS + 1);
		expect(typing.isTyping("1:7")).toBe(false);
	});

	it("restarts the timeout on each Typing notice", () => {
		typing.apply(typingEvent("Typing"));
		vi.advanceTimersByTime(TYPING_TIMEOUT_MS - 1000);
		typing.apply(typingEvent("Typing"));
		vi.advanceTimersByTime(TYPING_TIMEOUT_MS - 1000);
		expect(typing.isTyping("1:7")).toBe(true);
	});

	it("ignores our own typing", () => {
		typing.apply(typingEvent("Typing", 1));
		expect(typing.isTyping("1:7")).toBe(false);
	});
});
