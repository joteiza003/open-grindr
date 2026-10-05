// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	exists: vi.fn<(path: string) => Promise<boolean>>(),
}));

vi.mock("$lib/app-data", () => ({ existsAppDataFile: mocks.exists }));

import {
	clearTrace,
	panelOnScreen,
	startTrace,
	trace,
	traceReport,
} from "./map-trace";

beforeEach(() => {
	clearTrace();
	mocks.exists.mockReset();
	mocks.exists.mockResolvedValue(true);
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

describe("the report", () => {
	it("lists what happened, in order, with the device facts first", () => {
		trace("first");
		trace("second");

		const report = traceReport({ pins: 3 });

		expect(report).toContain("build: ");
		expect(report).toContain("cores:");
		expect(report).toContain("body pointer-events:");
		expect(report).toContain("pins: 3");
		expect(report.indexOf("first")).toBeLessThan(report.indexOf("second"));
	});

	it("says whether the Svelte runtime carries the stuck-batch patch", async () => {
		const globals = globalThis as { __svelte_batch_patched?: boolean };

		// Loading the runtime is what sets the marker; an install that lost the
		// patch (a Svelte bump, say) would fail here instead of on a phone.
		await import("svelte");
		expect(globals.__svelte_batch_patched).toBe(true);
		expect(traceReport()).toContain("svelte batch patch: applied");

		delete globals.__svelte_batch_patched;
		expect(traceReport()).toContain("svelte batch patch: missing");
		globals.__svelte_batch_patched = true;
	});

	it("keeps only the most recent events", () => {
		for (let i = 0; i < 400; i += 1) trace(`event ${i}`);

		const report = traceReport();

		expect(report).toContain("event 399");
		expect(report).toContain("event 100");
		expect(report).not.toContain("event 99\n");
		expect(report).not.toContain("event 0\n");
	});
});

describe("watching the screen", () => {
	function open() {
		const root = document.createElement("main");
		root.innerHTML = `<button aria-label="Back" class="a b c">Back</button>`;
		document.body.append(root);
		return { root, stop: startTrace(root) };
	}

	it("notes the screen opening and closing", () => {
		const { stop } = open();
		stop();

		const report = traceReport();
		expect(report).toContain("map screen opened");
		expect(report).toContain("map screen closed");
	});

	it("records what a touch landed on, and what was topmost there", () => {
		const { root, stop } = open();
		const button = root.querySelector("button")!;

		button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		stop();

		const report = traceReport();
		expect(report).toContain("touch on button.a.b[Back]");
		expect(report).toContain("click on button.a.b[Back]");
	});

	it("records errors that happen while the screen is open", () => {
		const { stop } = open();

		window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
		stop();

		expect(traceReport()).toContain("error: boom");
	});

	it("notices when the main thread was blocked", async () => {
		const { stop } = open();

		// A long synchronous freeze: timers fire late, all at once.
		vi.spyOn(performance, "now").mockReturnValue(performance.now() + 5_000);
		await vi.advanceTimersByTimeAsync(250);
		stop();

		expect(traceReport()).toMatch(/main thread was blocked for \d+ ms/);
	});

	it("notices when storage stops answering, and when it answers late", async () => {
		let answer: (() => void) | undefined;
		mocks.exists.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					answer = () => resolve(true);
				}),
		);
		const { stop } = open();

		await vi.advanceTimersByTimeAsync(5_000);
		await vi.advanceTimersByTimeAsync(1_100);
		expect(traceReport()).toContain("storage has not answered for 1000 ms");

		answer?.();
		await vi.advanceTimersByTimeAsync(0);
		stop();
	});

	it("stops watching when closed", async () => {
		const { root, stop } = open();
		stop();
		clearTrace();

		root.querySelector("button")!.dispatchEvent(
			new Event("pointerdown", { bubbles: true }),
		);
		await vi.advanceTimersByTimeAsync(20_000);

		expect(traceReport()).not.toContain("touch on");
		expect(mocks.exists).not.toHaveBeenCalled();
	});
});

describe("noticing a screen that stopped following its state", () => {
	function open(expected: () => string) {
		const root = document.createElement("main");
		root.innerHTML = `<div data-map-panel="none"></div>`;
		document.body.append(root);
		const onDesync = vi.fn();
		const stop = startTrace(root, { expectedPanel: expected, onDesync });
		const panel = root.querySelector<HTMLElement>("[data-map-panel]")!;
		return { root, panel, onDesync, stop };
	}

	it("reads what the panel area shows", () => {
		const root = document.createElement("div");
		expect(panelOnScreen(root)).toBe("missing");
		root.innerHTML = `<i data-map-panel="list"></i>`;
		expect(panelOnScreen(root)).toBe("list");
	});

	it("stays quiet while the screen matches the state", async () => {
		const { onDesync, stop } = open(() => "none");

		await vi.advanceTimersByTimeAsync(10_000);
		stop();

		expect(onDesync).not.toHaveBeenCalled();
	});

	it("allows the screen a moment to catch up", async () => {
		let expected = "none";
		const { panel, onDesync, stop } = open(() => expected);

		expected = "list";
		await vi.advanceTimersByTimeAsync(1_000);
		panel.setAttribute("data-map-panel", "list");
		await vi.advanceTimersByTimeAsync(5_000);
		stop();

		expect(onDesync).not.toHaveBeenCalled();
	});

	it("reports it once when the screen stays behind its state", async () => {
		const { onDesync, stop } = open(() => "list");

		await vi.advanceTimersByTimeAsync(10_000);
		stop();

		expect(onDesync).toHaveBeenCalledTimes(1);
		expect(onDesync).toHaveBeenCalledWith(
			'state says "list", screen shows "none"',
		);
		expect(traceReport()).toContain(
			"the screen stopped following its state",
		);
	});

	it("says again when it is stuck on something else", async () => {
		let expected = "list";
		const { onDesync, stop } = open(() => expected);
		await vi.advanceTimersByTimeAsync(3_000);

		expected = "pin";
		await vi.advanceTimersByTimeAsync(3_000);
		stop();

		expect(onDesync).toHaveBeenCalledTimes(2);
	});

	it("does not judge a screen nobody can see", async () => {
		Object.defineProperty(document, "hidden", {
			value: true,
			configurable: true,
		});
		const { onDesync, stop } = open(() => "list");

		await vi.advanceTimersByTimeAsync(10_000);
		stop();

		expect(onDesync).not.toHaveBeenCalled();
		Object.defineProperty(document, "hidden", {
			value: false,
			configurable: true,
		});
	});
});

describe("noticing a screen that stopped redrawing", () => {
	function open() {
		const root = document.createElement("main");
		root.setAttribute("data-map-heartbeat", "0");
		document.body.append(root);
		const onDesync = vi.fn();
		let beat = 0;
		const stop = startTrace(root, { expectedBeat: () => beat, onDesync });
		const tick = async (draw: boolean) => {
			beat += 1;
			if (draw) root.setAttribute("data-map-heartbeat", String(beat));
			await vi.advanceTimersByTimeAsync(1_000);
		};
		return { onDesync, stop, tick };
	}

	it("stays quiet while the screen shows every beat", async () => {
		const { onDesync, stop, tick } = open();

		for (let i = 0; i < 12; i += 1) await tick(true);
		stop();

		expect(onDesync).not.toHaveBeenCalled();
	});

	it("reports it once when the screen stops showing the beat", async () => {
		const { onDesync, stop, tick } = open();
		for (let i = 0; i < 3; i += 1) await tick(true);

		for (let i = 0; i < 10; i += 1) await tick(false);
		stop();

		expect(onDesync).toHaveBeenCalledTimes(1);
		expect(onDesync.mock.calls[0]![0]).toContain("the screen shows 3");
		expect(traceReport()).toContain("the screen stopped redrawing");
	});

	it("forgives a screen that was only late", async () => {
		const { onDesync, stop, tick } = open();

		await tick(false);
		await tick(false);
		await tick(true);
		for (let i = 0; i < 6; i += 1) await tick(true);
		stop();

		expect(onDesync).not.toHaveBeenCalled();
	});
});

describe("noticing taps that change nothing", () => {
	function open() {
		const root = document.createElement("main");
		root.innerHTML = `
			<button class="plain" aria-label="Close">Close</button>
			<button class="link" aria-label="Directions" data-no-dom-change>Directions</button>
			<button class="off" aria-label="Off" disabled>Off</button>`;
		document.body.append(root);
		const onDeadTaps = vi.fn();
		const stop = startTrace(root, { onDeadTaps });
		const click = (selector: string) =>
			root
				.querySelector(selector)!
				.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		const tap = async (selector: string) => {
			click(selector);
			await vi.advanceTimersByTimeAsync(900);
		};
		return { root, onDeadTaps, stop, tap, click };
	}

	it("notes a tap after which nothing on screen changed", async () => {
		const { stop, tap } = open();

		await tap(".plain");
		stop();

		expect(traceReport()).toContain("changed nothing on screen");
	});

	it("does not mind a tap that changed the screen", async () => {
		const { root, onDeadTaps, stop, click } = open();

		click(".plain");
		root.append(document.createElement("section"));
		await vi.advanceTimersByTimeAsync(900);
		stop();

		expect(traceReport()).not.toContain("changed nothing");
		expect(onDeadTaps).not.toHaveBeenCalled();
	});

	it("does not take the screen's own heartbeat for a reaction to the tap", async () => {
		const { root, stop, click } = open();

		click(".plain");
		root.setAttribute("data-map-heartbeat", "7");
		await vi.advanceTimersByTimeAsync(900);
		stop();

		expect(traceReport()).toContain("changed nothing on screen");
	});

	it("still records a tap that something earlier in the page swallowed", async () => {
		const { stop, tap } = open();
		const swallow = (event: Event) => event.stopImmediatePropagation();
		document.addEventListener("click", swallow, true);

		try {
			await tap(".plain");
		} finally {
			document.removeEventListener("click", swallow, true);
		}
		stop();

		expect(traceReport()).toContain("click on button.plain[Close]");
		expect(traceReport()).toContain("changed nothing on screen");
	});

	it("records a tap outside the screen without judging it", async () => {
		const { onDeadTaps, stop } = open();
		const outside = document.createElement("button");
		outside.setAttribute("aria-label", "Toast");
		document.body.append(outside);

		for (let i = 0; i < 3; i += 1) {
			outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			await vi.advanceTimersByTimeAsync(900);
		}
		stop();

		expect(traceReport()).toContain("click on button[Toast]");
		expect(traceReport()).not.toContain("changed nothing");
		expect(onDeadTaps).not.toHaveBeenCalled();
	});

	it("ignores disabled buttons and buttons that open another app", async () => {
		const { onDeadTaps, stop, tap } = open();

		await tap(".off");
		await tap(".link");
		await tap(".link");
		stop();

		expect(traceReport()).not.toContain("changed nothing");
		expect(onDeadTaps).not.toHaveBeenCalled();
	});

	it("raises the alarm after two such taps in a row", async () => {
		const { onDeadTaps, stop, tap } = open();

		await tap(".plain");
		expect(onDeadTaps).not.toHaveBeenCalled();
		await tap(".plain");
		stop();

		expect(onDeadTaps).toHaveBeenCalledTimes(1);
	});

	it("forgets earlier dead taps when one works", async () => {
		const { root, onDeadTaps, stop, tap, click } = open();

		await tap(".plain");
		click(".plain");
		root.append(document.createElement("section"));
		await vi.advanceTimersByTimeAsync(900);
		await tap(".plain");
		stop();

		expect(onDeadTaps).not.toHaveBeenCalled();
	});
});

describe("noticing frames that stop", () => {
	function open(frames: (callback: () => void) => void) {
		vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
			frames(callback);
			return 1;
		});
		const root = document.createElement("main");
		document.body.append(root);
		return startTrace(root);
	}

	it("notes a frame that took far too long to come", async () => {
		let waiting: (() => void) | undefined;
		const stop = open((callback) => {
			waiting = callback;
		});

		await vi.advanceTimersByTimeAsync(1_000);
		expect(waiting).toBeDefined();
		vi.setSystemTime(Date.now() + 4_000);
		vi.spyOn(performance, "now").mockReturnValue(performance.now() + 4_000);
		waiting?.();
		stop();

		expect(traceReport()).toMatch(/no frame was painted for \d+ ms/);
	});

	it("says nothing when frames keep coming", async () => {
		const stop = open((callback) => {
			setTimeout(callback, 16);
		});

		await vi.advanceTimersByTimeAsync(10_000);
		stop();

		expect(traceReport()).not.toContain("no frame was painted");
	});

	it("asks for one frame at a time instead of looping", async () => {
		let asked = 0;
		const stop = open(() => {
			asked += 1;
		});

		await vi.advanceTimersByTimeAsync(10_000);
		stop();

		expect(asked).toBe(1);
	});
});
