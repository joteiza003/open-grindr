import { describe, expect, it } from "vitest";

import { formatDuration, formatHour, formatPercent } from "./format";

describe("formatDuration", () => {
	it("formats short, minute and hour durations", () => {
		expect(formatDuration(20_000)).toBe("<1 min");
		expect(formatDuration(12 * 60_000)).toBe("12 min");
		expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
		expect(formatDuration(180 * 60_000)).toBe("3 h");
	});
});

describe("formatHour / formatPercent", () => {
	it("pads the hour and rounds the percentage", () => {
		expect(formatHour(7)).toBe("07:00");
		expect(formatHour(22)).toBe("22:00");
		expect(formatPercent(2 / 3)).toBe("67 %");
	});
});
