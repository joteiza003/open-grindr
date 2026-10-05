// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	goto: vi.fn<(...args: unknown[]) => Promise<void>>(),
	canGoBack: vi.fn<() => boolean>(),
	loadPage: vi.fn<(url: string) => void>(),
}));

vi.mock("$app/navigation", () => ({ goto: mocks.goto }));
vi.mock("$lib/util/history", () => ({ canGoBack: mocks.canGoBack }));

import { createLeaveMap } from "./leave-map";
import { clearTrace, traceReport } from "./map-trace";

const onMap = () => history.replaceState({}, "", "/map");
const onHome = () => history.replaceState({}, "", "/");
const leaveMap = createLeaveMap({ loadPage: mocks.loadPage });

/** What the map screen leaves in the page while it is on screen. */
const putMapOnScreen = () => {
	const screen = document.createElement("main");
	screen.setAttribute("data-map-heartbeat", "3");
	document.body.append(screen);
	return screen;
};

beforeEach(() => {
	mocks.goto.mockReset();
	mocks.goto.mockResolvedValue();
	mocks.loadPage.mockReset();
	mocks.canGoBack.mockReset();
	mocks.canGoBack.mockReturnValue(true);
	clearTrace();
	onMap();
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	document.body.replaceChildren();
	onHome();
});

describe("leaveMap", () => {
	it("goes one step back in history and stops there when that leaves the map", () => {
		const back = vi.spyOn(history, "back").mockImplementation(() => {
			onHome();
		});

		leaveMap();
		vi.advanceTimersByTime(5_000);

		expect(back).toHaveBeenCalledTimes(1);
		expect(mocks.goto).not.toHaveBeenCalled();
		expect(mocks.loadPage).not.toHaveBeenCalled();
	});

	it("goes to the home screen when the step back goes nowhere", () => {
		vi.spyOn(history, "back").mockImplementation(() => {});

		leaveMap();
		vi.advanceTimersByTime(300);

		expect(mocks.goto).toHaveBeenCalledWith("/", { replaceState: true });
		expect(traceReport()).toContain("the step back did not leave the map");
	});

	it("goes straight to the home screen when there is no history", () => {
		mocks.canGoBack.mockReturnValue(false);
		const back = vi.spyOn(history, "back").mockImplementation(() => {});

		leaveMap();

		expect(back).not.toHaveBeenCalled();
		expect(mocks.goto).toHaveBeenCalledWith("/", { replaceState: true });
	});

	it("loads the home screen afresh when the router never gets there", () => {
		vi.spyOn(history, "back").mockImplementation(() => {});

		leaveMap();
		vi.advanceTimersByTime(300);
		expect(mocks.loadPage).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1_300);

		expect(mocks.loadPage).toHaveBeenCalledExactlyOnceWith("/");
		expect(traceReport()).toContain("loading the home screen afresh");
	});

	it("loads the home screen afresh when the address changed but the map stayed on screen", () => {
		putMapOnScreen();
		vi.spyOn(history, "back").mockImplementation(() => {
			onHome();
		});

		leaveMap();
		vi.advanceTimersByTime(1_000);
		expect(mocks.loadPage).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1_000);

		expect(mocks.loadPage).toHaveBeenCalledExactlyOnceWith("/");
	});

	it("does not load anything afresh once the map is gone from the screen", () => {
		const screen = putMapOnScreen();
		vi.spyOn(history, "back").mockImplementation(() => {
			onHome();
		});

		leaveMap();
		vi.advanceTimersByTime(300);
		screen.remove();
		vi.advanceTimersByTime(2_000);

		expect(mocks.loadPage).not.toHaveBeenCalled();
	});

	it("does not load anything afresh once the router did leave", () => {
		vi.spyOn(history, "back").mockImplementation(() => {});

		leaveMap();
		vi.advanceTimersByTime(300);
		onHome();
		vi.advanceTimersByTime(2_000);

		expect(mocks.loadPage).not.toHaveBeenCalled();
	});

	it("loads the home screen afresh when the router refuses", async () => {
		mocks.canGoBack.mockReturnValue(false);
		mocks.goto.mockRejectedValue(new Error("no"));

		leaveMap();
		await vi.advanceTimersByTimeAsync(0);

		expect(mocks.loadPage).toHaveBeenCalledWith("/");
	});
});
