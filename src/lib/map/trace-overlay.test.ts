// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	writeText: vi.fn<(text: string) => Promise<void>>(),
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
	writeText: mocks.writeText,
}));

import {
	closeTraceOverlay,
	isTraceOverlayOpen,
	type OverlayTexts,
	showTraceOverlay,
} from "./trace-overlay";

const texts: OverlayTexts = {
	title: "Map diagnostics",
	hint: "Nothing is stored or sent.",
	copy: "Copy report",
	reload: "Reload the map",
	home: "Back to home",
	close: "Close",
	copied: "Report copied",
	copyFailed: "Couldn't copy the report",
};

const button = (name: string) =>
	[...document.querySelectorAll("button")].find(
		(item) => item.textContent === name,
	)!;

beforeEach(() => {
	mocks.writeText.mockReset();
	mocks.writeText.mockResolvedValue();
});
afterEach(() => {
	closeTraceOverlay();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("the diagnostics overlay", () => {
	it("shows the report over everything, as a dialog", () => {
		showTraceOverlay(texts, "line one\nline two");

		const dialog = document.querySelector('[role="dialog"]')!;
		expect(dialog.getAttribute("aria-label")).toBe("Map diagnostics");
		expect(dialog.querySelector("pre")?.textContent).toBe(
			"line one\nline two",
		);
		expect(isTraceOverlayOpen()).toBe(true);
		expect(Number((dialog as HTMLElement).style.zIndex)).toBeGreaterThan(
			2_147_483_000,
		);
	});

	it("copies the report and says so", async () => {
		showTraceOverlay(texts, "the report");

		button("Copy report").click();

		await vi.waitFor(() =>
			expect(mocks.writeText).toHaveBeenCalledWith("the report"),
		);
		await vi.waitFor(() =>
			expect(document.querySelector('[role="status"]')?.textContent).toBe(
				"Report copied",
			),
		);
	});

	it("falls back to the browser clipboard when Tauri's is unavailable", async () => {
		mocks.writeText.mockRejectedValue(new Error("no plugin"));
		const browserWrite = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", {
			...navigator,
			clipboard: { writeText: browserWrite },
		});
		showTraceOverlay(texts, "the report");

		button("Copy report").click();

		await vi.waitFor(() =>
			expect(browserWrite).toHaveBeenCalledWith("the report"),
		);
		vi.unstubAllGlobals();
	});

	it("says when copying failed and leaves the text selected for copying by hand", async () => {
		mocks.writeText.mockRejectedValue(new Error("no plugin"));
		vi.stubGlobal("navigator", {
			...navigator,
			clipboard: {
				writeText: vi.fn().mockRejectedValue(new Error("no")),
			},
		});
		showTraceOverlay(texts, "the report");

		button("Copy report").click();

		await vi.waitFor(() =>
			expect(document.querySelector('[role="status"]')?.textContent).toBe(
				"Couldn't copy the report",
			),
		);
		expect(window.getSelection()?.toString()).toBe("the report");
		vi.unstubAllGlobals();
	});

	it("copies the report at once when asked, for a screen that cannot be tapped", async () => {
		showTraceOverlay(texts, "the report", { autoCopy: true });

		await vi.waitFor(() =>
			expect(mocks.writeText).toHaveBeenCalledWith("the report"),
		);
		await vi.waitFor(() =>
			expect(document.querySelector('[role="status"]')?.textContent).toBe(
				"Report copied",
			),
		);
	});

	it("does not touch the clipboard on its own otherwise", () => {
		showTraceOverlay(texts, "the report");

		expect(mocks.writeText).not.toHaveBeenCalled();
	});

	it("reloads the page from its button", () => {
		const reload = vi.fn();
		showTraceOverlay(texts, "x", { reload });

		button("Reload the map").click();

		expect(reload).toHaveBeenCalledOnce();
	});

	it("goes to the home screen from its button", () => {
		const home = vi.fn();
		showTraceOverlay(texts, "x", { home });

		button("Back to home").click();

		expect(home).toHaveBeenCalledOnce();
	});

	it("closes with its button", () => {
		showTraceOverlay(texts, "x");

		button("Close").click();

		expect(isTraceOverlayOpen()).toBe(false);
	});

	it("replaces an overlay that is already open instead of stacking", () => {
		showTraceOverlay(texts, "first");
		showTraceOverlay(texts, "second");

		expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
		expect(document.querySelector("pre")?.textContent).toBe("second");
	});
});
