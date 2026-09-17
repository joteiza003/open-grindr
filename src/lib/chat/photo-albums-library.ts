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
