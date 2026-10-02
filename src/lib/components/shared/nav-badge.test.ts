import { describe, expect, it } from "vitest";

import { navBadge, navBadgeLabel } from "./nav-badge";

describe("navBadgeLabel", () => {
	it("hides empty counts and caps big ones", () => {
		expect(navBadgeLabel(0)).toBeNull();
		expect(navBadgeLabel(-3)).toBeNull();
		expect(navBadgeLabel(Number.NaN)).toBeNull();
		expect(navBadgeLabel(3)).toBe("3");
		expect(navBadgeLabel(9)).toBe("9");
		expect(navBadgeLabel(10)).toBe("9+");
		expect(navBadgeLabel(250)).toBe("9+");
	});
});

describe("navBadge", () => {
	it("prefers the number, falls back to a dot, else nothing", () => {
		expect(navBadge({ count: 4, pending: true })).toEqual({
			kind: "number",
			label: "4",
		});
		expect(navBadge({ count: 0, pending: true })).toEqual({ kind: "dot" });
		expect(navBadge({ count: 0, pending: false })).toBeNull();
	});
});
