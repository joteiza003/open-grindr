// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { longPress } from "./long-press";

function attach(callback: () => void) {
	const node = document.createElement("h1");
	document.body.append(node);
	const action = longPress(node, callback);
	return { node, action: action! };
}

const press = (node: HTMLElement) =>
	node.dispatchEvent(new Event("pointerdown"));
const release = (node: HTMLElement, type = "pointerup") =>
	node.dispatchEvent(new Event(type));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe("longPress", () => {
	it("fires once the press has been held long enough", () => {
		const callback = vi.fn();
		const { node } = attach(callback);

		press(node);
		vi.advanceTimersByTime(700);
		expect(callback).not.toHaveBeenCalled();
		vi.advanceTimersByTime(150);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("does not fire on a quick tap", () => {
		const callback = vi.fn();
		const { node } = attach(callback);

		press(node);
		vi.advanceTimersByTime(200);
		release(node);
		vi.advanceTimersByTime(2_000);

		expect(callback).not.toHaveBeenCalled();
	});

	it("does not fire when the finger leaves or the touch is cancelled", () => {
		const callback = vi.fn();
		const { node } = attach(callback);

		press(node);
		release(node, "pointerleave");
		press(node);
		release(node, "pointercancel");
		vi.advanceTimersByTime(2_000);

		expect(callback).not.toHaveBeenCalled();
	});

	it("uses the newest callback after an update", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { node, action } = attach(first);

		action.update?.(second);
		press(node);
		vi.advanceTimersByTime(900);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("stops listening once destroyed", () => {
		const callback = vi.fn();
		const { node, action } = attach(callback);

		press(node);
		action.destroy?.();
		vi.advanceTimersByTime(2_000);
		press(node);
		vi.advanceTimersByTime(2_000);

		expect(callback).not.toHaveBeenCalled();
	});
});
