import type { DrawerMedia } from "$lib/api/messaging/drawer";
import type { PhotoAlbum } from "$lib/model/messaging/photo-albums";
import { resolveAlbumMedia } from "./photo-albums-library";

export type AlbumSendProgress = {
	albumId: string;
	sent: number;
	total: number;
	failed: number;
	missing: number;
};

export function orderedAlbumMedia({
	album,
	drawer,
}: {
	album: PhotoAlbum;
	drawer: DrawerMedia[];
}): { items: DrawerMedia[]; missing: number; total: number } {
	const { available, missingIds, total } = resolveAlbumMedia({
		album,
		drawer,
	});
	return { items: available, missing: missingIds.length, total };
}

export class AlbumSendLock {
	#inflight: string | null = null;

	get inflightAlbumId(): string | null {
		return this.#inflight;
	}

	tryBegin(albumId: string): boolean {
		if (this.#inflight !== null) return false;
		this.#inflight = albumId;
		return true;
	}

	end(albumId: string): void {
		if (this.#inflight === albumId) this.#inflight = null;
	}
}

export const albumSendLock = new AlbumSendLock();
