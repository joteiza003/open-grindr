import { describe, expect, it, vi } from "vitest";

import { runMarkAllRead } from "./mark-all-read";

const noMore = () => Promise.resolve({ ids: [], nextPage: null });

describe("runMarkAllRead", () => {
	it("marks the loaded unread conversations", async () => {
		const markOne = vi.fn<(id: string) => Promise<boolean>>(() =>
			Promise.resolve(true),
		);
		const result = await runMarkAllRead({
			loadedUnreadIds: ["a", "b"],
			fetchUnreadPage: noMore,
			markOne,
		});
		expect(result).toEqual({ marked: 2, failed: 0, listFailed: false });
		expect(markOne.mock.calls.map(([id]) => id).toSorted()).toEqual([
			"a",
			"b",
		]);
	});

	it("also marks unread conversations that were never loaded, once each", async () => {
		const markOne = vi.fn<(id: string) => Promise<boolean>>(() =>
			Promise.resolve(true),
		);
		const pages: Record<
			number,
			{ ids: string[]; nextPage: number | null }
		> = {
			1: { ids: ["b", "c"], nextPage: 2 },
			2: { ids: ["d"], nextPage: null },
		};
		const result = await runMarkAllRead({
			loadedUnreadIds: ["a", "b"],
			fetchUnreadPage: (page) => Promise.resolve(pages[page]!),
			markOne,
		});
		expect(result.marked).toBe(4);
		expect(markOne).toHaveBeenCalledTimes(4);
	});

	it("counts failures without stopping the rest", async () => {
		const result = await runMarkAllRead({
			loadedUnreadIds: ["a", "b", "c"],
			fetchUnreadPage: noMore,
			markOne: (id) => Promise.resolve(id !== "b"),
		});
		expect(result).toEqual({ marked: 2, failed: 1, listFailed: false });
	});

	it("falls back to the loaded ones when the unread list cannot be fetched", async () => {
		const result = await runMarkAllRead({
			loadedUnreadIds: ["a"],
			fetchUnreadPage: () => Promise.reject(new Error("offline")),
			markOne: () => Promise.resolve(true),
		});
		expect(result).toEqual({ marked: 1, failed: 0, listFailed: true });
	});

	it("does nothing when nothing is unread", async () => {
		const markOne = vi.fn<(id: string) => Promise<boolean>>(() =>
			Promise.resolve(true),
		);
		const result = await runMarkAllRead({
			loadedUnreadIds: [],
			fetchUnreadPage: noMore,
			markOne,
		});
		expect(result.marked).toBe(0);
		expect(markOne).not.toHaveBeenCalled();
	});

	it("never runs more than a few requests at once", async () => {
		let running = 0;
		let peak = 0;
		await runMarkAllRead({
			loadedUnreadIds: Array.from({ length: 12 }, (_, i) => `c${i}`),
			fetchUnreadPage: noMore,
			markOne: async () => {
				running += 1;
				peak = Math.max(peak, running);
				await new Promise((resolve) => setTimeout(resolve, 5));
				running -= 1;
				return true;
			},
		});
		expect(peak).toBeLessThanOrEqual(4);
	});
});
