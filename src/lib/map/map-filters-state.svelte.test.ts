import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/app-data/preferences.svelte", () => ({
	preferencesSnapshot: () => ({ locale: "en" }),
	setPreferences: vi.fn(),
}));

import {
	defaultFilters,
	type GridSearchFilters,
} from "$lib/model/browse/grid/filters";
import { MapFiltersState } from "./map-filters-state.svelte";

function setup(initial?: GridSearchFilters) {
	const save = vi.fn<(filters: GridSearchFilters) => Promise<void>>(() =>
		Promise.resolve(),
	);
	const filters = new MapFiltersState({ initial, save });
	return { filters, save };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("what it starts with", () => {
	it("is every filter off when nothing was saved", () => {
		const { filters } = setup();

		expect(filters.count).toBe(0);
		expect(filters.compiled.active).toBe(false);
		expect(filters.value).toEqual(defaultFilters);
	});

	it("is what was saved", () => {
		const { filters } = setup({
			...defaultFilters,
			isOnline: true,
			ageEnabled: true,
			age: [25, 35],
		});

		expect(filters.count).toBe(2);
		expect(filters.compiled.active).toBe(true);
		expect(filters.value.age).toEqual([25, 35]);
	});

	it("does not touch the saved filters it was given", () => {
		const saved = { ...structuredClone(defaultFilters), isOnline: true };
		const { filters } = setup(saved);

		filters.value.isOnline = false;

		expect(saved.isOnline).toBe(true);
	});
});

describe("editing", () => {
	it("is seen at once by what is derived from it", () => {
		const { filters } = setup();

		filters.value.isOnline = true;
		expect(filters.count).toBe(1);
		expect(filters.compiled.active).toBe(true);
		expect(filters.compiled.needs).toEqual({ live: true, details: false });

		filters.value.tribesEnabled = true;
		filters.value.tribes = [2];
		expect(filters.count).toBe(2);
		expect(filters.compiled.needs).toEqual({ live: true, details: true });
	});

	it("clears every filter", () => {
		const { filters } = setup({
			...defaultFilters,
			isOnline: true,
			tribesEnabled: true,
			tribes: [2],
		});

		filters.clear();

		expect(filters.count).toBe(0);
		expect(filters.value).toEqual(defaultFilters);
	});
});

describe("saving", () => {
	it("waits for a burst of edits to stop, then saves the last state once", async () => {
		const { filters, save } = setup();

		filters.value.isOnline = true;
		filters.saveSoon();
		await vi.advanceTimersByTimeAsync(300);
		filters.value.ageEnabled = true;
		filters.value.age = [25, 35];
		filters.saveSoon();
		await vi.advanceTimersByTimeAsync(300);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(save).toHaveBeenCalledTimes(1);
		expect(save.mock.calls[0]![0]).toMatchObject({
			isOnline: true,
			ageEnabled: true,
			age: [25, 35],
		});
	});

	it("saves nothing when nothing changed", async () => {
		const { filters, save } = setup();

		filters.saveSoon();
		await vi.advanceTimersByTimeAsync(1_000);

		expect(save).not.toHaveBeenCalled();
	});

	it("saves nothing again for a state it already saved", async () => {
		const { filters, save } = setup();
		filters.value.isOnline = true;
		await filters.saveNow();

		filters.value.isOnline = false;
		filters.value.isOnline = true;
		await filters.saveNow();

		expect(save).toHaveBeenCalledTimes(1);
	});

	it("saves right away when asked to flush", async () => {
		const { filters, save } = setup();
		filters.value.isFavorite = true;
		filters.saveSoon();

		await filters.flush();

		expect(save).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it("saves what was cleared", async () => {
		const { filters, save } = setup({ ...defaultFilters, isOnline: true });

		filters.clear();
		await vi.advanceTimersByTimeAsync(600);

		expect(save).toHaveBeenCalledWith(defaultFilters);
	});

	it("says when saving failed and keeps the filters as they are", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { filters, save } = setup();
		const failed = vi.fn();
		filters.onSaveError = failed;
		save.mockRejectedValue(new Error("disk"));
		filters.value.isOnline = true;

		await filters.saveNow();

		expect(failed).toHaveBeenCalledTimes(1);
		expect(filters.value.isOnline).toBe(true);
	});
});
