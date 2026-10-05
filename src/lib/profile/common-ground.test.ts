import { describe, expect, it } from "vitest";

import { commonGround, hasCommonGround } from "./common-ground";

describe("commonGround", () => {
	it("finds shared tags regardless of case, keeping their spelling", () => {
		const common = commonGround(
			{ profileTags: ["Gym", "Music"] },
			{ profileTags: ["gym", "Travel"] },
		);
		expect(common.tags).toEqual(["gym"]);
	});

	it("finds shared looking-for, meet-at and tribes", () => {
		const common = commonGround(
			{ lookingFor: [1, 2], meetAt: [3], grindrTribes: [4, 5] },
			{ lookingFor: [2, 9], meetAt: [3, 7], grindrTribes: [6] },
		);
		expect(common.lookingFor).toEqual([2]);
		expect(common.meetAt).toEqual([3]);
		expect(common.tribes).toEqual([]);
	});

	it("handles missing data", () => {
		const common = commonGround(
			{},
			{ profileTags: null, lookingFor: null },
		);
		expect(hasCommonGround(common)).toBe(false);
	});
});
