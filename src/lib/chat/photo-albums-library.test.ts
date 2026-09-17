import { describe, expect, it } from "vitest";

import type { DrawerMedia } from "$lib/api/messaging/drawer";
import { albumsWithRecents, resolveAlbumMedia } from "./photo-albums-library";
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
	it("builds Recents from drawer order without copying bytes", () => {
		const albums = albumsWithRecents({
			stored: [
				{
					id: "viaje",
					name: "Viaje",
					coverImageId: "2",
					imageIds: ["2", "1", "9"],
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			drawer: [media(1, 10), media(2, 20)],
		});
		expect(albums[0]?.id).toBe("album-recents");
		expect(albums[0]?.imageIds).toEqual(["2", "1"]);
		expect(albums[1]?.name).toBe("Viaje");
	});

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
