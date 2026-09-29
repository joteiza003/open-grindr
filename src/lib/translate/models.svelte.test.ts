/* eslint-disable @typescript-eslint/unbound-method -- asserting on vi.fn mocks */
import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({
	current: {
		myLanguage: "es",
		defaultsInstalled: false,
		downloadOverMobile: false,
	},
}));
const updateMock = vi.hoisted(() =>
	vi.fn((patch: Record<string, unknown>) => {
		Object.assign(settings.current, patch);
		return Promise.resolve();
	}),
);
const toastMock = vi.hoisted(() => ({
	loading: vi.fn(() => "id"),
	success: vi.fn(),
	error: vi.fn(),
	dismiss: vi.fn(),
}));

vi.mock("./translation-state.svelte", () => ({
	translationSettings: () => settings.current,
	updateTranslationSettings: updateMock,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMock }));

import { DeviceModels } from "./models.svelte";
import type { NativeTranslate } from "./native";

function fakeNative(
	state: { downloaded: string[] },
	overrides: Partial<NativeTranslate> = {},
): NativeTranslate {
	return {
		available: () => true,
		identify: () => Promise.resolve("en"),
		translate: () => Promise.resolve(""),
		models: () =>
			Promise.resolve({
				downloaded: [...state.downloaded],
				supported: ["fr", "en", "es", "de"],
			}),
		download: vi.fn((code: string, wifiOnly: boolean) => {
			void wifiOnly;
			state.downloaded.push(code);
			return Promise.resolve();
		}),
		remove: vi.fn((code: string) => {
			state.downloaded = state.downloaded.filter((c) => c !== code);
			return Promise.resolve();
		}),
		...overrides,
	};
}

beforeEach(() => {
	settings.current = {
		myLanguage: "es",
		defaultsInstalled: false,
		downloadOverMobile: false,
	};
	vi.clearAllMocks();
});

describe("DeviceModels", () => {
	it("lists what is installed and what ML Kit supports", async () => {
		const models = new DeviceModels(fakeNative({ downloaded: ["en"] }));
		await models.refresh();
		expect(models.supported).toEqual(["de", "en", "es", "fr"]);
		expect([...models.downloaded]).toEqual(["en"]);
	});

	it("downloads over Wi-Fi unless mobile data was allowed", async () => {
		const state = { downloaded: [] as string[] };
		const native = fakeNative(state);
		const models = new DeviceModels(native);
		await models.download("de");
		expect(native.download).toHaveBeenLastCalledWith("de", true);
		settings.current.downloadOverMobile = true;
		await models.download("fr");
		expect(native.download).toHaveBeenLastCalledWith("fr", false);
		expect(models.downloaded.has("fr")).toBe(true);
	});

	it("reports download failures as codes and leaves the set untouched", async () => {
		const models = new DeviceModels(
			fakeNative(
				{ downloaded: [] },
				{ download: () => Promise.reject(new Error("wifi-required")) },
			),
		);
		expect(await models.download("de")).toBe("wifi-required");
		expect(models.downloaded.has("de")).toBe(false);
		expect(models.busy.size).toBe(0);
	});

	it("never deletes English, but deletes other languages", async () => {
		const state = { downloaded: ["en", "fr"] };
		const native = fakeNative(state);
		const models = new DeviceModels(native);
		await models.refresh();
		expect(await models.remove("en")).toBe("english-required");
		expect(native.remove).not.toHaveBeenCalled();
		expect(await models.remove("fr")).toBeNull();
		expect(models.downloaded.has("fr")).toBe(false);
	});

	it("installs English, French and the user's language on first launch", async () => {
		const state = { downloaded: [] as string[] };
		const models = new DeviceModels(fakeNative(state));
		await models.ensureDefaults();
		expect(state.downloaded.sort()).toEqual(["en", "es", "fr"]);
		expect(updateMock).toHaveBeenCalledWith({ defaultsInstalled: true });
		expect(toastMock.success).toHaveBeenCalled();
	});

	it("only fetches what is missing and doesn't repeat once done", async () => {
		const state = { downloaded: ["en"] };
		const native = fakeNative(state);
		const models = new DeviceModels(native);
		await models.ensureDefaults();
		expect(native.download).toHaveBeenCalledTimes(2);
		vi.mocked(native.download).mockClear();
		await new DeviceModels(native).ensureDefaults();
		expect(native.download).not.toHaveBeenCalled();
	});

	it("stays quiet and retries next launch when there is no Wi-Fi", async () => {
		const models = new DeviceModels(
			fakeNative(
				{ downloaded: [] },
				{ download: () => Promise.reject(new Error("wifi-required")) },
			),
		);
		await models.ensureDefaults();
		expect(settings.current.defaultsInstalled).toBe(false);
		expect(toastMock.error).not.toHaveBeenCalled();
		expect(toastMock.dismiss).toHaveBeenCalled();
	});

	it("does nothing where on-device translation isn't available", async () => {
		const native = fakeNative(
			{ downloaded: [] },
			{ available: () => false },
		);
		await new DeviceModels(native).ensureDefaults();
		expect(native.download).not.toHaveBeenCalled();
	});

	it("skips the user's language when ML Kit can't do it offline", async () => {
		settings.current.myLanguage = "eu";
		const state = { downloaded: [] as string[] };
		await new DeviceModels(fakeNative(state)).ensureDefaults();
		expect(state.downloaded.sort()).toEqual(["en", "fr"]);
	});
});
