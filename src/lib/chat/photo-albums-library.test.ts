import { describe, expect, it } from "vitest";

import type { DrawerMedia } from "$lib/api/messaging/drawer";
import {
	createPhotoAlbum,
	removePhotoAlbum,
	resolveAlbumMedia,
	upsertPhotoAlbum,
} from "./photo-albums-library";
import { AlbumSendLock, orderedAlbumMedia } from "./send-photo-album";

function media(id: number, createdTs = id): DrawerMedia {
	return {
		id,
		url: `https://example.test/${id}.jpg`,
		contentType: "image/jpeg",
		createdTs,
		used: false,
		takenOnGrindr: false,
	};
}

describe("virtual photo albums", () => {
	it("keeps album order and skips missing images", () => {
		const album = {
			id: "viaje",
			name: "Viaje",
			coverImageId: "2",
			imageIds: ["2", "9", "1"],
			createdAt: "2026-01-01T00:00:00.000Z",
		};
		const resolved = resolveAlbumMedia({
			album,
			drawer: [media(1), media(2)],
		});
		expect(resolved.available.map((item) => item.id)).toEqual([2, 1]);
		expect(resolved.missingIds).toEqual(["9"]);
		expect(resolved.total).toBe(3);

		const ordered = orderedAlbumMedia({
			album,
			drawer: [media(1), media(2)],
		});
		expect(ordered.items.map((item) => item.id)).toEqual([2, 1]);
		expect(ordered.missing).toBe(1);
	});

	it("does not start a second album send while one is in flight", () => {
		const lock = new AlbumSendLock();
		expect(lock.tryBegin("viaje")).toBe(true);
		expect(lock.tryBegin("viaje")).toBe(false);
		expect(lock.tryBegin("noche")).toBe(false);
		lock.end("viaje");
		expect(lock.tryBegin("noche")).toBe(true);
	});
});

describe("photo album editing", () => {
	it("creates an album with unique ids, first photo as cover", () => {
		const album = createPhotoAlbum({
			name: "  Viaje  ",
			imageIds: ["3", "1", "3"],
			id: "a1",
			now: new Date("2026-01-01T00:00:00.000Z"),
		});
		expect(album).toEqual({
			id: "a1",
			name: "Viaje",
			coverImageId: "3",
			imageIds: ["3", "1"],
			createdAt: "2026-01-01T00:00:00.000Z",
		});
	});

	it("upserts in place and appends new albums", () => {
		const a = createPhotoAlbum({ name: "A", imageIds: ["1"], id: "a" });
		const b = createPhotoAlbum({ name: "B", imageIds: ["2"], id: "b" });
		const list = upsertPhotoAlbum(upsertPhotoAlbum([], a), b);
		expect(list.map((x) => x.id)).toEqual(["a", "b"]);
		const renamed = upsertPhotoAlbum(list, { ...a, name: "A2" });
		expect(renamed.map((x) => x.name)).toEqual(["A2", "B"]);
	});

	it("removes by id", () => {
		const a = createPhotoAlbum({ name: "A", imageIds: [], id: "a" });
		expect(removePhotoAlbum([a], "a")).toEqual([]);
		expect(removePhotoAlbum([a], "x")).toEqual([a]);
	});
});
