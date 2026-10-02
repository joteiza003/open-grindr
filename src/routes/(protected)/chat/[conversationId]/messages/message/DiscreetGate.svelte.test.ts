// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enabled } = vi.hoisted(() => ({ enabled: { value: false } }));
vi.mock("$lib/chat/discreet-mode", () => ({
	discreetModeEnabled: () => enabled.value,
}));

import DiscreetGate from "./DiscreetGate.svelte";

const children = createRawSnippet(() => ({
	render: () => '<img alt="the photo" src="x.png" />',
}));

beforeEach(() => {
	enabled.value = false;
});
afterEach(cleanup);

describe("DiscreetGate", () => {
	it("shows the media untouched when discreet mode is off", () => {
		render(DiscreetGate, { props: { kind: "photo", children } });

		expect(screen.getByAltText("the photo")).toBeTruthy();
		expect(screen.queryByText("Photo, tap to open")).toBeNull();
	});

	it("hides the media behind a notice until it is tapped", async () => {
		enabled.value = true;
		render(DiscreetGate, { props: { kind: "photo", children } });

		expect(screen.queryByAltText("the photo")).toBeNull();
		await fireEvent.click(screen.getByText("Photo, tap to open"));
		expect(screen.getByAltText("the photo")).toBeTruthy();
	});

	it("can hide the media again after opening it", async () => {
		enabled.value = true;
		render(DiscreetGate, { props: { kind: "video", children } });

		await fireEvent.click(screen.getByText("Video, tap to open"));
		await fireEvent.click(screen.getByText("Hide"));
		expect(screen.queryByAltText("the photo")).toBeNull();
		expect(screen.getByText("Video, tap to open")).toBeTruthy();
	});
});
