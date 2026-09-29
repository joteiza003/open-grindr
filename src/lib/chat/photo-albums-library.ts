import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	parsePhotoAlbumsFile,
	type PhotoAlbum,
	recentsAlbum,
} from "$lib/model/messaging/photo-albums";
import type { DrawerMedia } from "$lib/api/messaging/drawer";

const ALBUMS_PATH = "chat-photo-albums.json";

export async function loadStoredPhotoAlbums(): Promise<PhotoAlbum[]> {
	if (!(await existsAppDataFile(ALBUMS_PATH))) return [];
	try {
		const bytes = await readAppDataFile(ALBUMS_PATH);
		return parsePhotoAlbumsFile(
			JSON.parse(new TextDecoder().decode(bytes)),
		);
	} catch (error) {
		console.error("[photo-albums] Failed to read", error);
		return [];
	}
}

export async function saveStoredPhotoAlbums(
	albums: PhotoAlbum[],
): Promise<void> {
	const content = new TextEncoder().encode(
		JSON.stringify({
			version: 1,
			albums: albums.filter((album) => album.dynamic !== "drawer"),
		}),
	);
	await writeAppDataFileAtomic({ path: ALBUMS_PATH, content });
}

export function albumsWithRecents({
	stored,
	drawer,
}: {
	stored: PhotoAlbum[];
	drawer: DrawerMedia[];
}): PhotoAlbum[] {
	const recentsIds = [...drawer]
		.sort((a, b) => b.createdTs - a.createdTs)
		.map((item) => String(item.id));
	return [recentsAlbum(recentsIds), ...stored];
}

export function resolveAlbumMedia({
	album,
	drawer,
}: {
	album: PhotoAlbum;
	drawer: DrawerMedia[];
}): { available: DrawerMedia[]; missingIds: string[]; total: number } {
	const byId = new Map(drawer.map((item) => [String(item.id), item]));
	const available: DrawerMedia[] = [];
	const missingIds: string[] = [];
	for (const imageId of album.imageIds) {
		const item = byId.get(imageId);
		if (item) available.push(item);
		else missingIds.push(imageId);
	}
	return { available, missingIds, total: album.imageIds.length };
}

export const PHOTO_ALBUM_NAME_MAX = 80;
export const PHOTO_ALBUM_MAX_PHOTOS = 100;

/** Build a new stored album from a selection (order = send order, first = cover). */
export function createPhotoAlbum({
	name,
	imageIds,
	now = new Date(),
	id = `album-${crypto.randomUUID()}`,
}: {
	name: string;
	imageIds: string[];
	now?: Date;
	id?: string;
}): PhotoAlbum {
	const ids = [...new Set(imageIds)].slice(0, PHOTO_ALBUM_MAX_PHOTOS);
	return {
		id,
		name: name.trim().slice(0, PHOTO_ALBUM_NAME_MAX),
		coverImageId: ids[0] ?? "",
		imageIds: ids,
		createdAt: now.toISOString(),
	};
}

/** Insert or replace by id, keeping list order (new albums go last). */
export function upsertPhotoAlbum(
	albums: PhotoAlbum[],
	album: PhotoAlbum,
): PhotoAlbum[] {
	if (album.dynamic === "drawer") return albums;
	const index = albums.findIndex((existing) => existing.id === album.id);
	if (index === -1) return [...albums, album];
	return albums.map((existing, i) => (i === index ? album : existing));
}

export function removePhotoAlbum(
	albums: PhotoAlbum[],
	albumId: string,
): PhotoAlbum[] {
	return albums.filter((album) => album.id !== albumId);
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Read-modify-write of the stored albums, serialized so two quick edits can't
 * clobber each other. Resolves with the list that was persisted.
 */
export function mutateStoredPhotoAlbums(
	update: (current: PhotoAlbum[]) => PhotoAlbum[],
): Promise<PhotoAlbum[]> {
	const run = mutationQueue.then(async () => {
		const next = update(await loadStoredPhotoAlbums());
		await saveStoredPhotoAlbums(next);
		return next;
	});
	mutationQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}
