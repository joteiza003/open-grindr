import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UsageEventLog, type UsageEventsBackend } from "./event-log";
import type { UsageEvent } from "./events";

function memoryBackend(seed: UsageEvent[] = []) {
	let stored = seed;
	const save = vi.fn((events: UsageEvent[]) => {
		stored = events;
		return Promise.resolve();
	});
	const backend: UsageEventsBackend = {
		load: () => Promise.resolve(stored),
		save,
	};
	return { backend, save, stored: () => stored };
}

describe("UsageEventLog", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("batches a burst of events into one write", async () => {
		const memory = memoryBackend([{ t: 1, k: "in", c: "a" }]);
		const log = new UsageEventLog(memory.backend);
		log.record({ k: "hide", c: 1, t: 2 });
		log.record({ k: "like", c: 2, t: 3 });
		await vi.advanceTimersByTimeAsync(2_500);
		expect(memory.save).toHaveBeenCalledTimes(1);
		expect(memory.stored().map((event) => event.k)).toEqual([
			"in",
			"hide",
			"like",
		]);
	});

	it("includes not-yet-written events when reading", async () => {
		const log = new UsageEventLog(memoryBackend().backend);
		log.record({ k: "out", c: "a", t: 5 });
		expect(await log.all()).toEqual([{ t: 5, k: "out", c: "a" }]);
	});

	it("flushes on demand", async () => {
		const memory = memoryBackend();
		const log = new UsageEventLog(memory.backend);
		log.record({ k: "skip", c: 9, t: 7 });
		await log.flush();
		expect(memory.stored()).toEqual([{ t: 7, k: "skip", c: 9 }]);
	});

	it("clears everything", async () => {
		const memory = memoryBackend([{ t: 1, k: "in" }]);
		const log = new UsageEventLog(memory.backend);
		await log.all();
		log.record({ k: "out", t: 2 });
		await log.clear();
		expect(memory.stored()).toEqual([]);
		expect(await log.all()).toEqual([]);
	});
});
