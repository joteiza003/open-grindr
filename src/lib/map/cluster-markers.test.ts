import { describe, expect, it } from "vitest";

import type { MapMarker } from "$lib/model/map-elements";
import { clusterMarkers } from "./cluster-markers";

function marker(id: string, latitude: number, longitude: number): MapMarker {
	return {
		id,
		latitude,
		longitude,
		title: id,
		createdAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("clusterMarkers", () => {
	it("keeps isolated markers as singles", () => {
		const result = clusterMarkers(
			[marker("a", 43.22, -2.05), marker("b", 40.4, -3.7)],
			8,
		);
		expect(result.every((item) => item.type === "single")).toBe(true);
		expect(result).toHaveLength(2);
	});

	it("groups nearby markers at low zoom", () => {
		const result = clusterMarkers(
			[
				marker("a", 43.22, -2.05),
				marker("b", 43.221, -2.051),
				marker("c", 43.219, -2.049),
			],
			10,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("group");
		if (result[0]?.type === "group") {
			expect(result[0].markers).toHaveLength(3);
		}
	});

	it("does not cluster at street-level zoom", () => {
		const result = clusterMarkers(
			[marker("a", 43.22, -2.05), marker("b", 43.221, -2.051)],
			17,
		);
		expect(result.every((item) => item.type === "single")).toBe(true);
	});
});
