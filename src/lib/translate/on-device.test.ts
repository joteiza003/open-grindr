/* eslint-disable @typescript-eslint/unbound-method -- asserting on vi.fn mocks */
import { describe, expect, it, vi } from "vitest";

import type { NativeTranslate } from "./native";
import { nativeErrorCode } from "./native";
import { createOnDeviceProvider } from "./on-device";
import { buildProviders } from "./providers-config";

function fakeNative(overrides: Partial<NativeTranslate> = {}): NativeTranslate {
	return {
		available: () => true,
		identify: vi.fn(() => Promise.resolve("es")),
		translate: vi.fn(() => Promise.resolve("Hello")),
		models: vi.fn(() => Promise.resolve({ downloaded: [], supported: [] })),
		download: vi.fn(() => Promise.resolve()),
		remove: vi.fn(() => Promise.resolve()),
		...overrides,
	};
}

describe("nativeErrorCode", () => {
	it("finds the plugin code inside wrapped errors", () => {
		expect(nativeErrorCode("model-missing:fr")).toBe("model-missing");
		expect(nativeErrorCode(new Error("Media error: wifi-required"))).toBe(
			"wifi-required",
		);
		expect(
			nativeErrorCode({ kind: "Media", message: "download-failed" }),
		).toBe("download-failed");
		expect(nativeErrorCode("boom")).toBe("failed");
	});
});

describe("on-device provider", () => {
	it("detects the language, then translates on the phone", async () => {
		const native = fakeNative();
		const result = await createOnDeviceProvider(native).translate({
			text: "Hola",
			from: "auto",
			to: "en",
		});
		expect(result).toEqual({ text: "Hello", detected: "es" });
		expect(native.translate).toHaveBeenCalledWith("Hola", "es", "en");
	});

	it("skips detection when the source is known", async () => {
		const native = fakeNative();
		await createOnDeviceProvider(native).translate({
			text: "Hola",
			from: "es",
			to: "en",
		});
		expect(native.identify).not.toHaveBeenCalled();
	});

	it("uses the fallback language when detection is inconclusive", async () => {
		const native = fakeNative({ identify: () => Promise.resolve("und") });
		await createOnDeviceProvider(native).translate({
			text: "ok",
			from: "auto",
			to: "en",
			fallbackFrom: "es",
		});
		expect(native.translate).toHaveBeenCalledWith("ok", "es", "en");
	});

	it("refuses when the language can't be determined at all", async () => {
		const native = fakeNative({ identify: () => Promise.resolve("und") });
		await expect(
			createOnDeviceProvider(native).translate({
				text: "ok",
				from: "auto",
				to: "en",
			}),
		).rejects.toMatchObject({ code: "bad-response" });
	});

	it("maps plugin errors so the chain can fall back", async () => {
		const unsupported = fakeNative({
			translate: () => Promise.reject(new Error("unsupported-language")),
		});
		await expect(
			createOnDeviceProvider(unsupported).translate({
				text: "Kaixo",
				from: "eu",
				to: "en",
			}),
		).rejects.toMatchObject({ code: "unsupported" });
		const missing = fakeNative({
			translate: () => Promise.reject(new Error("model-missing:fr")),
		});
		await expect(
			createOnDeviceProvider(missing).translate({
				text: "Salut",
				from: "fr",
				to: "en",
			}),
		).rejects.toMatchObject({ code: "model-missing" });
	});

	it("returns the text untouched when it is already in the target language", async () => {
		const native = fakeNative({ identify: () => Promise.resolve("en") });
		const result = await createOnDeviceProvider(native).translate({
			text: "Hi",
			from: "auto",
			to: "en",
		});
		expect(result.text).toBe("Hi");
		expect(native.translate).not.toHaveBeenCalled();
	});
});

describe("buildProviders", () => {
	const base = { onDevice: true, onlineFallback: true, email: "" };

	it("puts on-device first, then the online services", () => {
		expect(buildProviders(base, fakeNative()).map((p) => p.id)).toEqual([
			"on-device",
			"mymemory",
			"lingva",
		]);
	});

	it("can be strictly on-device", () => {
		expect(
			buildProviders(
				{ ...base, onlineFallback: false },
				fakeNative(),
			).map((p) => p.id),
		).toEqual(["on-device"]);
	});

	it("uses only the online services where there is no on-device option", () => {
		const desktop = fakeNative({ available: () => false });
		expect(buildProviders(base, desktop).map((p) => p.id)).toEqual([
			"mymemory",
			"lingva",
		]);
		expect(
			buildProviders({ ...base, onlineFallback: false }, desktop).map(
				(p) => p.id,
			),
		).toEqual(["mymemory", "lingva"]);
	});

	it("skips on-device when the user turned it off", () => {
		expect(
			buildProviders({ ...base, onDevice: false }, fakeNative()).map(
				(p) => p.id,
			),
		).toEqual(["mymemory", "lingva"]);
	});
});
