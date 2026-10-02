import { describe, expect, it } from "vitest";

import { cardMotion } from "./deck-motion";

describe("cardMotion", () => {
	it("follows the finger and tilts, with limits", () => {
		const motion = cardMotion({ dx: 70, dy: 0, leaving: null });
		expect(motion.x).toBe(70);
		expect(motion.rotation).toBe(5);
		expect(cardMotion({ dx: 1000, dy: 0, leaving: null }).rotation).toBe(
			14,
		);
	});

	it("shows the like or hide label depending on the side", () => {
		expect(cardMotion({ dx: 45, dy: 0, leaving: null }).acceptOpacity).toBe(
			0.5,
		);
		expect(
			cardMotion({ dx: -45, dy: 0, leaving: null }).rejectOpacity,
		).toBe(0.5);
	});

	it("recognizes an upward swipe and shows only the skip label", () => {
		const motion = cardMotion({ dx: 10, dy: -60, leaving: null });
		expect(motion.upwards).toBe(true);
		expect(motion.acceptOpacity).toBe(0);
		expect(motion.skipOpacity).toBeCloseTo(60 / 90);
	});

	it("flies off to the side it is leaving by", () => {
		expect(cardMotion({ dx: 0, dy: 0, leaving: "right" })).toMatchObject({
			x: 600,
			rotation: 18,
		});
		expect(cardMotion({ dx: 0, dy: 0, leaving: "left" })).toMatchObject({
			x: -600,
			rotation: -18,
		});
		expect(cardMotion({ dx: 0, dy: 0, leaving: "up" })).toMatchObject({
			x: 0,
			y: -700,
		});
	});
});
