/* eslint-disable @typescript-eslint/unbound-method -- asserting on vi.fn mocks */
import { describe, expect, it, vi } from "vitest";

import {
	APP_ICON_IDS,
	appIconErrorCode,
	type AppIconNative,
	isAppIconId,
} from "./app-icon";
import { AppIconState } from "./app-icon.svelte";

function fakeNative(overrides: Partial<AppIconNative> = {}): AppIconNative {
	return {
		available: () => true,
		current: vi.fn(() => Promise.resolve("default" as const)),
		set: vi.fn((icon) => Promise.resolve(icon)),
		...overrides,
	};
}

describe("app icon ids", () => {
	it("recognises only the icons the manifest declares", () => {
		expect(APP_ICON_IDS).toEqual([
			"default",
			"calculator",
			"notes",
			"weather",
			"clock",
		]);
		expect(isAppIconId("notes")).toBe(true);
		expect(isAppIconId("Notes")).toBe(false);
		expect(isAppIconId(undefined)).toBe(false);
	});

	it("finds the plugin's error code inside wrapped errors", () => {
		expect(appIconErrorCode("unknown-icon")).toBe("unknown-icon");
		expect(
			appIconErrorCode({
				kind: "Media",
				message: "app-icon-unavailable",
			}),
		).toBe("unavailable");
		expect(appIconErrorCode(new Error("boom"))).toBe("failed");
	});
});

describe("AppIconState", () => {
	it("reads the active icon", async () => {
		const state = new AppIconState(
			fakeNative({ current: () => Promise.resolve("clock") }),
		);

		await state.load();

		expect(state.current).toBe("clock");
		expect(state.loading).toBe(false);
	});

	it("does not ask the native layer where there is none", async () => {
		const native = fakeNative({ available: () => false });
		const state = new AppIconState(native);

		await state.load();

		expect(native.current).not.toHaveBeenCalled();
		expect(state.available).toBe(false);
		expect(state.loading).toBe(false);
	});

	it("keeps the default when reading fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const state = new AppIconState(
			fakeNative({ current: () => Promise.reject(new Error("nope")) }),
		);

		await state.load();

		expect(state.current).toBe("default");
		expect(state.loading).toBe(false);
	});

	it("switches the icon", async () => {
		const native = fakeNative();
		const state = new AppIconState(native);

		expect(await state.choose("calculator")).toBeNull();

		expect(native.set).toHaveBeenCalledWith("calculator");
		expect(state.current).toBe("calculator");
		expect(state.busy).toBe(false);
	});

	it("does nothing when the icon is already active", async () => {
		const native = fakeNative();
		const state = new AppIconState(native);

		expect(await state.choose("default")).toBeNull();

		expect(native.set).not.toHaveBeenCalled();
	});

	it("reports a failed switch and keeps the previous icon", async () => {
		const state = new AppIconState(
			fakeNative({ set: () => Promise.reject(new Error("failed")) }),
		);

		expect(await state.choose("weather")).toBe("failed");

		expect(state.current).toBe("default");
		expect(state.busy).toBe(false);
	});
});
