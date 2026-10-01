import { describe, expect, it } from "vitest";

import {
	clampPan,
	clampScale,
	DeckZoom,
	DOUBLE_TAP_ZOOM,
	MAX_ZOOM,
	pinchScale,
} from "./deck-zoom.svelte";

describe("clampScale / pinchScale", () => {
	it("keeps the scale between 1x and the maximum", () => {
		expect(clampScale(0.2)).toBe(1);
		expect(clampScale(9)).toBe(MAX_ZOOM);
		expect(clampScale(2)).toBe(2);
	});

	it("scales by how much the fingers moved", () => {
		expect(
			pinchScale({ startScale: 1, startDistance: 100, distance: 200 }),
		).toBe(2);
		expect(
			pinchScale({ startScale: 2, startDistance: 100, distance: 50 }),
		).toBe(1);
		expect(
			pinchScale({ startScale: 3, startDistance: 0, distance: 50 }),
		).toBe(3);
	});
});

describe("clampPan", () => {
	it("does not let the image leave the frame", () => {
		expect(clampPan({ value: 500, scale: 2, size: 300 })).toBe(150);
		expect(clampPan({ value: -500, scale: 2, size: 300 })).toBe(-150);
		expect(clampPan({ value: 40, scale: 2, size: 300 })).toBe(40);
		expect(clampPan({ value: 40, scale: 1, size: 300 })).toBe(0);
	});
});

describe("DeckZoom", () => {
	it("toggles between normal and the double-tap zoom", () => {
		const zoom = new DeckZoom();
		expect(zoom.active).toBe(false);
		zoom.toggle();
		expect(zoom.scale).toBe(DOUBLE_TAP_ZOOM);
		expect(zoom.active).toBe(true);
		zoom.toggle();
		expect(zoom.scale).toBe(1);
		expect(zoom.x).toBe(0);
	});

	it("resets position when zoom is reset", () => {
		const zoom = new DeckZoom();
		zoom.toggle();
		zoom.x = 30;
		zoom.reset();
		expect(zoom.x).toBe(0);
		expect(zoom.active).toBe(false);
	});

	it("does not consume a single touch while at normal size", () => {
		const zoom = new DeckZoom();
		const event = {
			pointerId: 1,
			clientX: 10,
			clientY: 10,
		} as PointerEvent;
		expect(zoom.down(event)).toBe(false);
		expect(zoom.up(event)).toBe(false);
	});
});
