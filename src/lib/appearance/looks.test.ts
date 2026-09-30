import { decode, encode } from "@msgpack/msgpack";
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
import { accents } from "$lib/appearance/accents";
import {
	DEFAULT_LOOK,
	lookPreset,
	looks,
	lookSchema,
} from "$lib/appearance/looks";

/**
 * Los looks son el único cambio del rediseño que toca datos: `look` es una
 * preferencia nueva y tiene que ser aditiva (sin `look` guardado → "lumen").
 * El orden de los tests importa: el de compatibilidad lee del disco antes de
 * que la caché del módulo se hidrate con otra cosa.
 */
describe("looks de fábrica", () => {
	it("declara claves únicas y un preset para cada una", () => {
		const keys = looks.map((look) => look.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) expect(lookPreset(key).key).toBe(key);
	});

	it("solo usa acentos que existen", () => {
		const known = new Set(accents.map((accent) => accent.key));
		for (const look of looks) expect(known.has(look.accent)).toBe(true);
	});

	it("valida los presets y arranca en lumen", () => {
		for (const look of looks) {
			expect(lookSchema.safeParse(look.key).success).toBe(true);
		}
		expect(lookSchema.safeParse("neon").success).toBe(false);
		expect(DEFAULT_LOOK).toBe("lumen");
		expect(preferencesSnapshot().appearance.look).toBe(DEFAULT_LOOK);
	});

	it("lee preferencias sin look guardado como lumen", async () => {
		readMock.mockResolvedValueOnce(
			encode({
				appearance: {
					theme: "light",
					accent: "blue",
					density: "compact",
					animations: false,
				},
			}),
		);

		const stored = await getPreferences();
		expect(stored.appearance.look).toBe("lumen");
		expect(stored.appearance.theme).toBe("light");
		expect(stored.appearance.animations).toBe(false);
	});

	it("persiste el look elegido sin tocar el resto de la apariencia", async () => {
		const appearance = {
			...preferencesSnapshot().appearance,
			look: "slate" as const,
			theme: "dark" as const,
			accent: "teal" as const,
			density: "compact" as const,
		};
		await setPreferences({ appearance });

		expect(preferencesSnapshot().appearance.look).toBe("slate");
		const written = writeMock.mock.calls.at(-1)?.[0] as {
			content: Uint8Array;
		};
		const decoded = decode(written.content) as {
			appearance: { look: string; animations: boolean };
		};
		expect(decoded.appearance.look).toBe("slate");
		expect(decoded.appearance.animations).toBe(appearance.animations);
	});
});
