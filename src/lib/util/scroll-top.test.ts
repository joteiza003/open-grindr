// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { findMainScroller, isDoubleTap, scrollMainToTop } from "./scroll-top";

describe("isDoubleTap", () => {
	it("needs a previous tap inside the window", () => {
		expect(isDoubleTap({ lastAt: null, now: 1000 })).toBe(false);
		expect(isDoubleTap({ lastAt: 800, now: 1000 })).toBe(true);
		expect(isDoubleTap({ lastAt: 100, now: 1000 })).toBe(false);
		expect(isDoubleTap({ lastAt: 1200, now: 1000 })).toBe(false);
	});
});

function scrollable({ scrollTop = 0 } = {}) {
	document.body.innerHTML =
		'<main><div id="small"></div><div id="list"></div></main>';
	const list = document.getElementById("list") as HTMLElement;
	const small = document.getElementById("small") as HTMLElement;
	for (const [element, height] of [
		[list, 600],
		[small, 100],
	] as const) {
		element.style.overflowY = "auto";
		Object.defineProperty(element, "clientHeight", { value: height });
		Object.defineProperty(element, "scrollHeight", { value: 2000 });
	}
	list.scrollTop = scrollTop;
	list.scrollTo = ((options: ScrollToOptions) => {
		list.scrollTop = options.top ?? 0;
	}) as typeof list.scrollTo;
	return list;
}

describe("findMainScroller / scrollMainToTop", () => {
	it("picks the tallest scrollable element in main", () => {
		const list = scrollable();
		expect(findMainScroller()).toBe(list);
	});

	it("scrolls it to the top and says so", () => {
		const list = scrollable({ scrollTop: 500 });
		expect(scrollMainToTop()).toBe(true);
		expect(list.scrollTop).toBe(0);
	});

	it("reports nothing to do when already at the top", () => {
		scrollable({ scrollTop: 0 });
		expect(scrollMainToTop()).toBe(false);
	});
});
