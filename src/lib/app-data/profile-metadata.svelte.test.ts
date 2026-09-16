import { beforeEach, describe, expect, it, vi } from "vitest";

type Module = typeof import("./profile-metadata.svelte");

// The store is a module singleton backed by localStorage (web-store fallback,
// since isTauri() is false under vitest). Re-import fresh per test and clear
// storage so each test starts from an empty, unhydrated store.
async function freshModule(): Promise<Module> {
	localStorage.clear();
	vi.resetModules();
	return import("./profile-metadata.svelte");
}

describe("profile metadata store", () => {
	let mod: Module;

	beforeEach(async () => {
		mod = await freshModule();
		await mod.hydrateProfileMetadata();
	});

	it("returns a normalized empty entry for unknown profiles", () => {
		const meta = mod.profileMetadata(123);
		expect(meta.tags).toEqual([]);
		expect(meta.note).toBeUndefined();
		expect(meta.hidden).toBeFalsy();
	});

	it("stores and trims a note", async () => {
		await mod.setProfileNote(1, "  met at the bar  ");
		expect(mod.profileMetadata(1).note).toBe("met at the bar");
	});

	it("prunes a profile when its note is cleared and nothing else remains", async () => {
		await mod.setProfileNote(1, "hi");
		expect(mod.profileMetadataSnapshot()["1"]).toBeDefined();
		await mod.setProfileNote(1, "   ");
		expect(mod.profileMetadataSnapshot()["1"]).toBeUndefined();
	});

	it("adds, dedupes (case-insensitively), and removes tags", async () => {
		await mod.addProfileTag(2, "Gym");
		await mod.addProfileTag(2, "gym");
		await mod.addProfileTag(2, "Travel");
		expect(mod.profileMetadata(2).tags).toEqual(["Gym", "Travel"]);

		await mod.removeProfileTag(2, "GYM");
		expect(mod.profileMetadata(2).tags).toEqual(["Travel"]);
	});

	it("toggles a tag on and off", async () => {
		await mod.toggleProfileTag(3, "date");
		expect(mod.profileMetadata(3).tags).toEqual(["date"]);
		await mod.toggleProfileTag(3, "date");
		expect(mod.profileMetadata(3).tags).toEqual([]);
	});

	it("keeps note and tags independent on the same profile", async () => {
		await mod.setProfileNote(4, "note");
		await mod.addProfileTag(4, "friend");
		const meta = mod.profileMetadata(4);
		expect(meta.note).toBe("note");
		expect(meta.tags).toEqual(["friend"]);
	});

	it("records view and interaction timestamps", async () => {
		await mod.recordProfileView(5, 1000);
		await mod.recordProfileInteraction(5, 2000);
		const meta = mod.profileMetadata(5);
		expect(meta.lastViewed).toBe(1000);
		expect(meta.lastInteraction).toBe(2000);
	});

	it("lists recently viewed profiles most-recent first", async () => {
		await mod.recordProfileView(10, 100);
		await mod.recordProfileView(20, 300);
		await mod.recordProfileView(30, 200);
		expect(mod.recentlyViewedProfileIds()).toEqual([20, 30, 10]);
	});

	it("aggregates distinct tags and finds profiles by tag", async () => {
		await mod.addProfileTag(1, "Gym");
		await mod.addProfileTag(2, "gym");
		await mod.addProfileTag(2, "Travel");
		expect(mod.allProfileTags()).toEqual(["Gym", "Travel"]);
		expect(mod.profileIdsWithTag("GYM").sort((a, b) => a - b)).toEqual([
			1, 2,
		]);
	});

	it("persists across a fresh module load (reads back from disk)", async () => {
		await mod.setProfileNote(7, "persist me");
		await mod.addProfileTag(7, "keep");

		// Re-import WITHOUT clearing localStorage to simulate an app restart.
		vi.resetModules();
		const reloaded: Module = await import("./profile-metadata.svelte");
		await reloaded.hydrateProfileMetadata();

		const meta = reloaded.profileMetadata(7);
		expect(meta.note).toBe("persist me");
		expect(meta.tags).toEqual(["keep"]);
	});

	it("clears all metadata for a profile", async () => {
		await mod.setProfileNote(8, "temp");
		await mod.addProfileTag(8, "x");
		await mod.clearProfileMetadata(8);
		expect(mod.profileMetadataSnapshot()["8"]).toBeUndefined();
	});

	it("toggles the hidden flag and prunes when unset", async () => {
		await mod.setProfileHidden(9, true);
		expect(mod.profileMetadata(9).hidden).toBe(true);
		await mod.setProfileHidden(9, false);
		expect(mod.profileMetadataSnapshot()["9"]).toBeUndefined();
	});
});
