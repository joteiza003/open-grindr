import { describe, expect, it } from "vitest";

import {
	addFrequentPhraseFromText,
	memoryFrequentPhrasesBackend,
} from "./frequent-phrases-library";
import { FrequentPhrasesState } from "./frequent-phrases-state.svelte";

const seed = [
	{ id: "a", text: "Hola", sortOrder: 0 },
	{ id: "b", text: "Adiós", sortOrder: 1 },
	{ id: "c", text: "Vale", sortOrder: 2 },
];

async function setup() {
	const backend = memoryFrequentPhrasesBackend(seed);
	const state = new FrequentPhrasesState(backend);
	await state.load();
	return { backend, state };
}

describe("FrequentPhrasesState", () => {
	it("adds, rejects duplicates and persists", async () => {
		const { backend, state } = await setup();
		expect(await state.add("Nuevo")).toEqual({ ok: true });
		expect(await state.add("nuevo")).toEqual({
			ok: false,
			problem: "duplicate",
		});
		expect(await state.add("  ")).toEqual({ ok: false, problem: "empty" });
		expect(state.phrases.map((p) => p.text)).toEqual([
			"Hola",
			"Adiós",
			"Vale",
			"Nuevo",
		]);
		expect((await backend.load()).length).toBe(4);
	});

	it("edits a phrase, allowing its own text unchanged", async () => {
		const { state } = await setup();
		expect(await state.edit("a", "Hola")).toEqual({ ok: true });
		expect(await state.edit("a", "Vale")).toEqual({
			ok: false,
			problem: "duplicate",
		});
		expect(await state.edit("a", "Buenas")).toEqual({ ok: true });
		expect(state.phrases[0]?.text).toBe("Buenas");
	});

	it("multi-selects and deletes the selection", async () => {
		const { state } = await setup();
		state.startSelecting("a");
		state.toggle("c");
		expect(state.selected.size).toBe(2);
		await state.removeSelected();
		expect(state.phrases.map((p) => p.id)).toEqual(["b"]);
		expect(state.selecting).toBe(false);
		expect(state.selected.size).toBe(0);
	});

	it("select all toggles, and moves reorder", async () => {
		const { state } = await setup();
		state.startSelecting();
		state.toggleAll();
		expect(state.allSelected).toBe(true);
		state.toggleAll();
		expect(state.selected.size).toBe(0);
		await state.move("c", -2);
		expect(state.phrases.map((p) => p.id)).toEqual(["c", "a", "b"]);
	});

	it("can be emptied and stays empty, then reset to defaults", async () => {
		const { backend, state } = await setup();
		await state.remove(["a", "b", "c"]);
		expect(await backend.load()).toEqual([]);
		await state.resetToDefaults();
		expect(state.phrases).toHaveLength(20);
	});
});

describe("addFrequentPhraseFromText", () => {
	it("adds a message text and reports duplicates", async () => {
		const backend = memoryFrequentPhrasesBackend(seed);
		expect(await addFrequentPhraseFromText("Qué pasa", backend)).toBeNull();
		expect(await addFrequentPhraseFromText("qué pasa", backend)).toBe(
			"duplicate",
		);
		expect((await backend.load()).map((p) => p.text)).toContain("Qué pasa");
	});
});
