// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";

import RangeBoundInputs from "./RangeBoundInputs.svelte";

afterEach(cleanup);

function renderInputs(value: number[]) {
	let current = value;
	render(RangeBoundInputs, {
		props: {
			get value() {
				return current;
			},
			set value(next: number[]) {
				current = next;
			},
			floor: 18,
			ceiling: 99,
			minLabel: "Minimum age",
			maxLabel: "Maximum age",
		},
	});
	return { value: () => current };
}

describe("RangeBoundInputs", () => {
	it("shows only the bounds that are set", () => {
		renderInputs([25, 99]);

		expect(
			screen.getByLabelText<HTMLInputElement>("Minimum age").value,
		).toBe("25");
		expect(
			screen.getByLabelText<HTMLInputElement>("Maximum age").value,
		).toBe("");
	});

	it("applies a typed minimum when the field loses focus", async () => {
		const range = renderInputs([18, 99]);
		const min = screen.getByLabelText("Minimum age");

		await fireEvent.input(min, { target: { value: "30" } });
		await fireEvent.blur(min);

		expect(range.value()).toEqual([30, 99]);
	});

	it("applies a typed maximum on Enter and clamps it", async () => {
		const range = renderInputs([18, 99]);
		const max = screen.getByLabelText("Maximum age");

		await fireEvent.input(max, { target: { value: "500" } });
		await fireEvent.keyDown(max, { key: "Enter" });
		expect(range.value()).toEqual([18, 99]);

		await fireEvent.input(max, { target: { value: "45" } });
		await fireEvent.keyDown(max, { key: "Enter" });
		expect(range.value()).toEqual([18, 45]);
	});
});
