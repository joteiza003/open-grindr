import { describe, expect, it } from "vitest";

import { peaksFromSamples, seekFraction } from "./waveform";

describe("peaksFromSamples", () => {
	it("returns the peak of each segment, relative to the loudest one", () => {
		const samples = [0.1, -0.2, 0.4, -0.8, 0.05, 0.0, -0.4, 0.2];
		expect(peaksFromSamples(samples, 4)).toEqual([0.25, 1, 0.0625, 0.5]);
	});

	it("handles silence and empty input", () => {
		expect(peaksFromSamples([0, 0, 0, 0], 2)).toEqual([0, 0]);
		expect(peaksFromSamples([], 4)).toEqual([]);
		expect(peaksFromSamples([1], 0)).toEqual([]);
	});

	it("returns as many bars as asked even with few samples", () => {
		expect(peaksFromSamples([0.5, 1], 4)).toHaveLength(4);
	});
});

describe("seekFraction", () => {
	it("maps a click inside the waveform to 0..1 and clamps outside", () => {
		expect(seekFraction({ clientX: 150, left: 100, width: 200 })).toBe(
			0.25,
		);
		expect(seekFraction({ clientX: 50, left: 100, width: 200 })).toBe(0);
		expect(seekFraction({ clientX: 999, left: 100, width: 200 })).toBe(1);
		expect(seekFraction({ clientX: 150, left: 100, width: 0 })).toBe(0);
	});
});
