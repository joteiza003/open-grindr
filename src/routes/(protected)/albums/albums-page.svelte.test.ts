// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/navigation", () => ({ afterNavigate: () => {} }));
vi.mock("$lib/components/chat/AlbumLibrary.svelte", () => ({
	default: () => {},
}));

import AlbumsPage from "./+page.svelte";

function renderPage({ canGoBack }: { canGoBack: boolean }) {
	const back = vi.fn();
	vi.stubGlobal("navigation", { canGoBack });
	vi.stubGlobal("history", { length: canGoBack ? 2 : 1, back });
	const link = render(AlbumsPage).getByRole("link", { name: "Back" });
	return { back, link };
}

function click(link: HTMLElement): boolean {
	let followed = false;
	const listening = new AbortController();
	document.addEventListener(
		"click",
		(event) => {
			followed = !event.defaultPrevented;
			event.preventDefault();
		},
		{ signal: listening.signal },
	);
	link.dispatchEvent(
		new MouseEvent("click", { bubbles: true, cancelable: true }),
	);
	listening.abort();
	return followed;
}

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("the saved albums page back button", () => {
	it("points at settings when there is nowhere to go back to", () => {
		const { back, link } = renderPage({ canGoBack: false });

		expect(link.getAttribute("href")).toBe("/settings");
		expect(click(link)).toBe(true);
		expect(back).not.toHaveBeenCalled();
	});

	it("steps back through the history instead of pushing a new entry", () => {
		const { back, link } = renderPage({ canGoBack: true });

		expect(click(link)).toBe(false);
		expect(back).toHaveBeenCalledTimes(1);
	});
});
