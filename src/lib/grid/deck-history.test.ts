import { describe, expect, it } from "vitest";

import { popUndo, pushUndo, withFirst } from "./deck-history";

describe("pushUndo", () => {
	it("keeps the order and drops the oldest beyond the cap", () => {
		let history = pushUndo([], { id: 1, kind: "skip" }, 2);
		history = pushUndo(history, { id: 2, kind: "reject" }, 2);
		history = pushUndo(history, { id: 3, kind: "like" }, 2);
		expect(history.map((entry) => entry.id)).toEqual([2, 3]);
	});

	it("does not keep a profile twice", () => {
		let history = pushUndo([], { id: 1, kind: "skip" });
		history = pushUndo(history, { id: 2, kind: "skip" });
		history = pushUndo(history, { id: 1, kind: "reject" });
		expect(history).toEqual([
			{ id: 2, kind: "skip" },
			{ id: 1, kind: "reject" },
		]);
	});
});

describe("popUndo", () => {
	it("returns the latest decision and the rest", () => {
		const history = pushUndo([{ id: 1, kind: "skip" }], {
			id: 2,
			kind: "like",
		});
		expect(popUndo(history)).toEqual({
			decision: { id: 2, kind: "like" },
			rest: [{ id: 1, kind: "skip" }],
		});
	});

	it("returns null when there is nothing to undo", () => {
		expect(popUndo([])).toBeNull();
	});
});

describe("withFirst", () => {
	const candidates = [{ id: 1 }, { id: 2 }, { id: 3 }];

	it("moves the chosen candidate to the front", () => {
		expect(withFirst(candidates, 3).map((c) => c.id)).toEqual([3, 1, 2]);
	});

	it("leaves the list alone when the id is absent or already first", () => {
		expect(withFirst(candidates, 9)).toBe(candidates);
		expect(withFirst(candidates, 1)).toBe(candidates);
		expect(withFirst(candidates, null)).toBe(candidates);
	});
});
