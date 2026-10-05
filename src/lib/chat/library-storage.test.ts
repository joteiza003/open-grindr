import { describe, expect, it } from "vitest";

import type { SavedAlbum } from "$lib/model/messaging/saved-albums";
import { formatBytes, totalBytes, usageByContact } from "./library-storage";

function entry(
	localId: string,
	profileId: number,
	sizeBytes: number,
	displayName: string | null = null,
): SavedAlbum {
	return {
		localId,
		storageId: localId,
		albumId: 0,
		messageId: "",
		conversationId: `c${profileId}`,
		senderId: profileId,
		createdAt: 0,
		savedAt: 0,
		sourceTemporary: false,
		expiresAt: null,
		profileSnapshot: { profileId, displayName, age: null, distance: null },
		coverPath: null,
		items: [],
		kind: "photo",
		sizeBytes,
		tags: [],
		favorite: false,
		hidden: false,
	};
}

describe("usageByContact", () => {
	it("groups by contact and puts the heaviest first", () => {
		const usage = usageByContact([
			entry("a", 1, 100, "Ana"),
			entry("b", 2, 500, "Bea"),
			entry("c", 1, 200),
		]);
		expect(usage.map((u) => [u.name, u.count, u.bytes])).toEqual([
			["Bea", 1, 500],
			["Ana", 2, 300],
		]);
		expect(usage[1]?.localIds).toEqual(["a", "c"]);
	});

	it("sums the total", () => {
		expect(totalBytes([entry("a", 1, 100), entry("b", 2, 50)])).toBe(150);
	});
});

describe("formatBytes", () => {
	it("scales units", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(1536)).toBe("1.5 KB");
		expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
	});
});
