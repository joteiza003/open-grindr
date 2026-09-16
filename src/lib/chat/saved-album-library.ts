import {
	existsAppDataFile,
	readAppDataFile,
	removeAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	type SavedAlbum,
	savedAlbumsFileSchema,
} from "$lib/model/messaging/saved-albums";

/**
 * Local persistence for the saved-album library, built on the existing
 * app-data engine. The index is a JSON file; each album's media bytes live in
 * their own flat app-data files (no nested directories, so the atomic writer
 * needs no extra mkdir), named by the album's filename-safe `storageId`.
 */

const INDEX_PATH = "album-library/index.json";

const EXTENSIONS: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"video/mp4": "mp4",
	"video/quicktime": "mov",
	"video/webm": "webm",
};

function extensionFor(contentType: string): string {
	return EXTENSIONS[contentType.toLowerCase()] ?? "bin";
}

export function mediaFileName(
	storageId: string,
	key: string,
	contentType: string,
): string {
	return `album-media__${storageId}__${key}.${extensionFor(contentType)}`;
}

async function loadIndex(): Promise<SavedAlbum[]> {
	if (!(await existsAppDataFile(INDEX_PATH))) return [];
	const bytes = await readAppDataFile(INDEX_PATH);
	const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
	return savedAlbumsFileSchema.parse(parsed).albums;
}

async function writeIndex(albums: SavedAlbum[]): Promise<void> {
	const content = new TextEncoder().encode(
		JSON.stringify({ version: 1, albums }),
	);
	await writeAppDataFileAtomic({ path: INDEX_PATH, content });
}

export async function loadSavedAlbums(): Promise<SavedAlbum[]> {
	return loadIndex();
}

export async function upsertSavedAlbum(album: SavedAlbum): Promise<void> {
	const albums = await loadIndex();
	const index = albums.findIndex((a) => a.localId === album.localId);
	if (index === -1) albums.unshift(album);
	else albums[index] = album;
	await writeIndex(albums);
}

export async function updateSavedAlbum(
	localId: string,
	patch: Partial<Pick<SavedAlbum, "tags" | "favorite" | "hidden">>,
): Promise<SavedAlbum | null> {
	const albums = await loadIndex();
	const index = albums.findIndex((a) => a.localId === localId);
	if (index === -1) return null;
	const updated = { ...albums[index], ...patch } as SavedAlbum;
	albums[index] = updated;
	await writeIndex(albums);
	return updated;
}

export async function deleteSavedAlbum(localId: string): Promise<void> {
	const albums = await loadIndex();
	const album = albums.find((a) => a.localId === localId);
	if (album) {
		const paths = [
			album.coverPath,
			...album.items.map((item) => item.localPath),
			...album.items.map((item) => item.thumbnailPath),
		].filter((path): path is string => path !== null);
		for (const path of paths) {
			try {
				await removeAppDataFile(path);
			} catch (error) {
				console.error("[album-library] Failed to remove media", error);
			}
		}
	}
	await writeIndex(albums.filter((a) => a.localId !== localId));
}

export async function writeMediaFile(
	path: string,
	bytes: Uint8Array,
): Promise<void> {
	await writeAppDataFileAtomic({ path, content: bytes });
}

/**
 * Read a stored media file as an object URL. The caller owns the URL and must
 * revoke it with URL.revokeObjectURL when done.
 */
export async function savedMediaUrl(
	path: string,
	contentType: string,
): Promise<string | null> {
	if (!(await existsAppDataFile(path))) return null;
	const bytes = await readAppDataFile(path);
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return URL.createObjectURL(new Blob([copy], { type: contentType }));
}

/** Fetch media bytes through the native media proxy (an ogmedia URL). */
export async function downloadMediaBytes(
	proxiedUrl: string,
): Promise<Uint8Array> {
	const response = await fetch(proxiedUrl);
	if (!response.ok) {
		throw new Error(`Media fetch failed with status ${response.status}`);
	}
	return new Uint8Array(await response.arrayBuffer());
}
