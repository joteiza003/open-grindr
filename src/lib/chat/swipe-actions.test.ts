import { describe, expect, it } from "vitest";

import {
	SWIPE_MAX_PX,
	SWIPE_TRIGGER_PX,
	swipeIntent,
	swipeOffset,
	swipeResult,
} from "./swipe-actions";

describe("swipeIntent", () => {
	it("waits until the finger has moved a little", () => {
		expect(swipeIntent({ dx: 4, dy: 3 })).toBe("undecided");
	});

	it("is horizontal only when it clearly dominates", () => {
		expect(swipeIntent({ dx: 40, dy: 10 })).toBe("horizontal");
		expect(swipeIntent({ dx: -40, dy: 5 })).toBe("horizontal");
		expect(swipeIntent({ dx: 30, dy: 30 })).toBe("vertical");
		expect(swipeIntent({ dx: 5, dy: 50 })).toBe("vertical");
	});
});

describe("swipeOffset", () => {
	it("follows the finger up to the trigger, then slows down", () => {
		expect(swipeOffset(40)).toBe(40);
		expect(swipeOffset(-40)).toBe(-40);
		expect(swipeOffset(SWIPE_TRIGGER_PX + 40)).toBeLessThan(
			SWIPE_TRIGGER_PX + 40,
		);
		expect(swipeOffset(1000)).toBe(SWIPE_MAX_PX);
		expect(swipeOffset(-1000)).toBe(-SWIPE_MAX_PX);
	});
});

describe("swipeResult", () => {
	const actions = { left: "mute", right: "pin" } as const;

	it("does nothing below the trigger", () => {
		expect(swipeResult({ dx: SWIPE_TRIGGER_PX - 1, actions })).toBeNull();
	});

	it("maps each direction to its action", () => {
		expect(swipeResult({ dx: SWIPE_TRIGGER_PX, actions })).toBe("pin");
		expect(swipeResult({ dx: -SWIPE_TRIGGER_PX, actions })).toBe("mute");
	});

	it("does nothing when the direction is set to none", () => {
		expect(
			swipeResult({ dx: 200, actions: { left: "mute", right: "none" } }),
		).toBeNull();
	});
});
