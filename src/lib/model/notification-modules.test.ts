import { describe, expect, it } from "vitest";

import {
	DEFAULT_NOTIFICATION_MODULES,
	moveNotificationModule,
	normalizeNotificationModules,
	orderedNotificationModules,
	toggleNotificationModule,
} from "./notification-modules";

describe("normalizeNotificationModules", () => {
	it("drops unknown and repeated ids", () => {
		expect(
			normalizeNotificationModules(["stats", "x", "stats", "unanswered"]),
		).toEqual(["stats", "unanswered"]);
	});

	it("falls back to the defaults when nothing valid is left", () => {
		expect(normalizeNotificationModules(["x"])).toEqual([
			...DEFAULT_NOTIFICATION_MODULES,
		]);
	});
});

describe("modules order and visibility", () => {
	it("lists visible modules first, then hidden ones", () => {
		const list = orderedNotificationModules(["stats"]);
		expect(list[0]).toEqual({ id: "stats", visible: true });
		expect(list).toHaveLength(4);
		expect(list.slice(1).every((entry) => !entry.visible)).toBe(true);
	});

	it("moves and toggles but keeps at least one module", () => {
		expect(
			moveNotificationModule(["stats", "shortcuts"], "shortcuts", -1),
		).toEqual(["shortcuts", "stats"]);
		expect(toggleNotificationModule(["stats"], "stats")).toEqual(["stats"]);
		expect(toggleNotificationModule(["stats"], "shortcuts")).toEqual([
			"stats",
			"shortcuts",
		]);
	});
});
