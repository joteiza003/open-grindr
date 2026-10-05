import { decode, encode } from "@msgpack/msgpack";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const { readMock, writeMock } = vi.hoisted(() => ({
	readMock: vi.fn(),
	writeMock: vi.fn(),
}));

vi.mock("$lib/app-data", () => ({
	existsAppDataFile: () => Promise.resolve(true),
	readAppDataFile: readMock,
	removeAppDataFile: () => Promise.resolve(),
	writeAppDataFileAtomic: writeMock,
}));

import {
	getPreferences,
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import {
	BASE_LAYERS,
	baseLayerSchema,
	DEFAULT_BASE_LAYER,
	otherBaseLayer,
} from "./base-layers";

describe("base layers", () => {
	it("swaps one for the other", () => {
		expect(otherBaseLayer("standard")).toBe("satellite");
		expect(otherBaseLayer("satellite")).toBe("standard");
	});

	it("starts on the street map and knows every layer it can draw", () => {
		expect(DEFAULT_BASE_LAYER).toBe("standard");
		expect(Object.keys(BASE_LAYERS).sort()).toEqual(
			[...baseLayerSchema.options].sort(),
		);
	});

	it("addresses a tile by zoom, column and row in the order each service expects", () => {
		expect(BASE_LAYERS.standard.url).toMatch(/\{z\}\/\{x\}\/\{y\}/);
		// Esri puts the row before the column.
		expect(BASE_LAYERS.satellite.url).toMatch(/\{z\}\/\{y\}\/\{x\}$/);
	});

	it("credits each service on the map it draws", () => {
		expect(BASE_LAYERS.standard.attribution).toContain("OpenStreetMap");
		expect(BASE_LAYERS.satellite.attribution).toContain("Esri");
	});

	it("is let through by the Tauri content policy, or the installed app would show an empty map", () => {
		const config = JSON.parse(
			readFileSync(resolve("src-tauri/tauri.conf.json"), "utf8"),
		) as { app: { security: { csp: string } } };
		const imageSources = config.app.security.csp
			.split(";")
			.map((directive) => directive.trim())
			.find((directive) => directive.startsWith("img-src "));

		expect(imageSources).toBeDefined();
		for (const { url } of Object.values(BASE_LAYERS)) {
			const origin = new URL(url.replace(/\{[xyz]\}/g, "0")).origin;
			expect(imageSources).toContain(origin);
		}
	});
});

/**
 * The first test reads from disk before the module's cache is filled with
 * anything else, so the order here matters.
 */
describe("the saved choice", () => {
	it("is the street map until one is made", () => {
		expect(preferencesSnapshot().mapLayer).toBe("standard");
	});

	it("falls back to the street map when what was saved means nothing", async () => {
		readMock.mockResolvedValueOnce(encode({ mapLayer: "hybrid" }));

		const stored = await getPreferences();

		expect(stored.mapLayer).toBe("standard");
	});

	it("keeps the satellite view once it is chosen", async () => {
		await setPreferences({ mapLayer: "satellite" });

		expect(preferencesSnapshot().mapLayer).toBe("satellite");
		const written = writeMock.mock.calls.at(-1)?.[0] as {
			content: Uint8Array;
		};
		expect((decode(written.content) as { mapLayer: string }).mapLayer).toBe(
			"satellite",
		);
		expect((await getPreferences()).mapLayer).toBe("satellite");
	});
});
