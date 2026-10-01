import { describe, expect, it } from "vitest";

import {
	DEFAULT_NAV_TABS,
	moveNavTab,
	type NavTabId,
	normalizeNavTabs,
	orderedNavTabs,
	toggleNavTab,
} from "./nav-tabs";

describe("normalizeNavTabs", () => {
	it("drops unknown and repeated ids", () => {
		expect(normalizeNavTabs(["chat", "nope", "browse", "chat"])).toEqual([
			"chat",
			"browse",
		]);
	});

	it("falls back to the defaults below the minimum", () => {
		expect(normalizeNavTabs(["chat"])).toEqual([...DEFAULT_NAV_TABS]);
		expect(normalizeNavTabs([])).toEqual([...DEFAULT_NAV_TABS]);
	});
});

describe("orderedNavTabs", () => {
	it("lists visible tabs first, then the hidden ones", () => {
		const list = orderedNavTabs(["chat", "browse"]);
		expect(list.slice(0, 2)).toEqual([
			{ id: "chat", visible: true },
			{ id: "browse", visible: true },
		]);
		expect(list.slice(2).every((tab) => !tab.visible)).toBe(true);
		expect(list).toHaveLength(6);
	});
});

describe("moveNavTab", () => {
	const tabs: NavTabId[] = ["browse", "chat", "interest"];

	it("moves a tab and stops at the ends", () => {
		expect(moveNavTab(tabs, "chat", -1)).toEqual([
			"chat",
			"browse",
			"interest",
		]);
		expect(moveNavTab(tabs, "browse", -1)).toEqual(tabs);
		expect(moveNavTab(tabs, "interest", 1)).toEqual(tabs);
	});
});

describe("toggleNavTab", () => {
	it("shows a hidden tab at the end", () => {
		expect(toggleNavTab(["browse", "chat"], "rightNow")).toEqual([
			"browse",
			"chat",
			"rightNow",
		]);
	});

	it("hides a tab but never below the minimum", () => {
		expect(toggleNavTab(["browse", "chat", "interest"], "chat")).toEqual([
			"browse",
			"interest",
		]);
		expect(toggleNavTab(["browse", "chat"], "chat")).toEqual([
			"browse",
			"chat",
		]);
	});
});
