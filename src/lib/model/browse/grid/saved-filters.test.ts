import { describe, expect, it } from "vitest";

import { defaultFilters } from "./filters";
import {
	addSavedFilter,
	markSeen,
	MAX_SAVED_FILTERS,
	newIdsFor,
	type SavedFilter,
} from "./saved-filters";

function saved(overrides: Partial<SavedFilter> = {}): SavedFilter {
	return {
		id: "a",
		name: "Cerca",
		filters: structuredClone(defaultFilters),
		seenIds: [],
		baselineSet: false,
		...overrides,
	};
}

describe("addSavedFilter", () => {
	it("adds a trimmed copy of the filters", () => {
		const result = addSavedFilter({
			list: [],
			name: "  Cerca  ",
			filters: defaultFilters,
			id: "x",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.list[0]?.name).toBe("Cerca");
		expect(result.list[0]?.filters).toEqual(defaultFilters);
		expect(result.list[0]?.filters).not.toBe(defaultFilters);
		expect(result.list[0]?.baselineSet).toBe(false);
	});

	it("rejects an empty name, a repeated name and a full list", () => {
		const base = { filters: defaultFilters, id: "n" };
		expect(addSavedFilter({ list: [], name: "  ", ...base })).toEqual({
			ok: false,
			problem: "empty-name",
		});
		expect(
			addSavedFilter({ list: [saved()], name: "cerca", ...base }),
		).toEqual({ ok: false, problem: "duplicate-name" });
		const full = Array.from({ length: MAX_SAVED_FILTERS }, (_, i) =>
			saved({ id: `i${i}`, name: `f${i}` }),
		);
		expect(addSavedFilter({ list: full, name: "otro", ...base })).toEqual({
			ok: false,
			problem: "too-many",
		});
	});
});

describe("newIdsFor", () => {
	it("announces nothing before the baseline is set", () => {
		expect(newIdsFor(saved(), [1, 2, 3])).toEqual([]);
	});

	it("returns only profiles not seen yet, without repeats", () => {
		const filter = saved({ baselineSet: true, seenIds: [1, 2] });
		expect(newIdsFor(filter, [1, 2, 3, 3, 4])).toEqual([3, 4]);
	});
});

describe("markSeen", () => {
	it("sets the baseline and keeps ids without repeats", () => {
		const next = markSeen(saved({ seenIds: [1] }), [1, 2]);
		expect(next.baselineSet).toBe(true);
		expect(next.seenIds).toEqual([1, 2]);
	});

	it("forgets the oldest ids beyond the cap", () => {
		const next = markSeen(saved({ seenIds: [1, 2, 3] }), [4, 5], 4);
		expect(next.seenIds).toEqual([2, 3, 4, 5]);
	});
});
