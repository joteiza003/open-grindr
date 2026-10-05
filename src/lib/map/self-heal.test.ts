// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearTrace, traceReport } from "./map-trace";
import { lastSelfHeal, reloadOnce } from "./self-heal";

beforeEach(() => {
	sessionStorage.clear();
	clearTrace();
	vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("reloadOnce", () => {
	it("reloads and says why", () => {
		const reload = vi.fn();

		expect(reloadOnce("the panel did not open", reload)).toBe(true);

		expect(reload).toHaveBeenCalledTimes(1);
		expect(traceReport()).toContain(
			"reloading the screen: the panel did not open",
		);
	});

	it("does not reload again right after, so a bug that is still there cannot loop", () => {
		const reload = vi.fn();
		reloadOnce("first", reload);

		vi.advanceTimersByTime(60_000);
		expect(reloadOnce("second", reload)).toBe(false);

		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads again once enough time has passed", () => {
		const reload = vi.fn();
		reloadOnce("first", reload);

		vi.advanceTimersByTime(121_000);

		expect(reloadOnce("later", reload)).toBe(true);
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it("does not reload when it cannot remember that it did", () => {
		const reload = vi.fn();
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});

		expect(reloadOnce("no storage", reload)).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});
});

describe("lastSelfHeal", () => {
	it("says nothing when the screen never restarted itself", () => {
		expect(lastSelfHeal()).toBeNull();
	});

	it("says when and why the screen last restarted itself", () => {
		reloadOnce("the screen shows 7", vi.fn());

		vi.advanceTimersByTime(12_400);

		expect(lastSelfHeal()).toBe("12 s ago, the screen shows 7");
	});

	it("says nothing when storage cannot be read", () => {
		reloadOnce("whatever", vi.fn());
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});

		expect(lastSelfHeal()).toBeNull();
		vi.restoreAllMocks();
	});
});
