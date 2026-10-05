// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	exists: vi.fn<(path: string) => Promise<boolean>>(),
}));

vi.mock("$lib/app-data", () => ({ existsAppDataFile: mocks.exists }));

import { clearTrace, startTrace, trace, traceReport } from "./map-trace";

beforeEach(() => {
	clearTrace();
	mocks.exists.mockReset();
	mocks.exists.mockResolvedValue(true);
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe("the report", () => {
	it("lists what happened, in order, with the device facts first", () => {
		trace("first");
		trace("second");

		const report = traceReport({ pins: 3 });

		expect(report).toContain("cores:");
		expect(report).toContain("body pointer-events:");
		expect(report).toContain("pins: 3");
		expect(report.indexOf("first")).toBeLessThan(report.indexOf("second"));
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
		vi.setSystemTime(Date.now() + 5_000);
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
