import {
	type AlbumMediaPath,
	existsAppDataFile,
	readAppDataFile,
	removeAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import { createWriteSerializer } from "$lib/app-data/serialize";
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

// A flat filename: writeAppDataFileAtomic only ensures the AppLocalData base
// dir exists, not nested subdirectories, so the index must not live in a subdir.
const INDEX_PATH = "album-library-index.json";

// Serialize index mutations so overlapping saves/edits can't clobber each other.
const serialize = createWriteSerializer();

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

/** Album media lives in the closed family of names the native side accepts. */
export function albumMediaPath(path: string): AlbumMediaPath {
	if (!path.startsWith("album-media__")) {
		throw new Error(`Not an album media path: ${path}`);
	}
	return path as AlbumMediaPath;
}

export function mediaFileName(
	storageId: string,
	key: string,
	contentType: string,
): AlbumMediaPath {
	return `album-media__${storageId}__${key}.${extensionFor(contentType)}`;
}

async function loadIndex(): Promise<SavedAlbum[]> {
	if (!(await existsAppDataFile(INDEX_PATH))) return [];
	const bytes = await readAppDataFile(INDEX_PATH);
	const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
	const whole = savedAlbumsFileSchema.safeParse(parsed);
	if (whole.success) return whole.data.albums;

	// One album that no longer matches the schema must not hide the rest of the
	// library (or make every later save fail): keep the ones that still parse.
	const list =
		typeof parsed === "object" &&
		parsed !== null &&
		"albums" in parsed &&
		Array.isArray(parsed.albums)
			? parsed.albums
			: [];
	const kept: SavedAlbum[] = [];
	for (const entry of list) {
		const one = savedAlbumsFileSchema.safeParse({
			version: 1,
			albums: [entry],
		});
		if (one.success) kept.push(...one.data.albums);
		else
			console.error(
				"[album-library] dropping unreadable album",
				one.error,
			);
	}
	return kept;
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

function mediaPathsOf(album: SavedAlbum): string[] {
	return [
		album.coverPath,
		...album.items.map((item) => item.localPath),
		...album.items.map((item) => item.thumbnailPath),
	].filter((path): path is string => path !== null);
}

/** Best-effort removal; a file that is already gone is not an error. */
export async function removeMediaFiles(paths: string[]): Promise<void> {
	for (const path of paths) {
		try {
			await removeAppDataFile(albumMediaPath(path));
		} catch (error) {
			console.error("[album-library] Failed to remove media", error);
		}
	}
}

export async function upsertSavedAlbum(album: SavedAlbum): Promise<void> {
	let replaced: SavedAlbum | undefined;
	await serialize(async () => {
		const albums = await loadIndex();
		const index = albums.findIndex((a) => a.localId === album.localId);
		if (index === -1) albums.unshift(album);
		else {
			replaced = albums[index];
			albums[index] = album;
		}
		await writeIndex(albums);
	});
	// Saving an album again writes a fresh set of files; drop the old set.
	if (replaced !== undefined && replaced.storageId !== album.storageId) {
		await removeMediaFiles(mediaPathsOf(replaced));
	}
}

export async function updateSavedAlbum(
	localId: string,
	patch: Partial<Pick<SavedAlbum, "tags" | "favorite" | "hidden">>,
): Promise<SavedAlbum | null> {
	return serialize(async () => {
		const albums = await loadIndex();
		const index = albums.findIndex((a) => a.localId === localId);
		if (index === -1) return null;
		const updated = { ...albums[index], ...patch } as SavedAlbum;
		albums[index] = updated;
		await writeIndex(albums);
		return updated;
	});
}

export async function deleteSavedAlbum(localId: string): Promise<void> {
	await serialize(async () => {
		const albums = await loadIndex();
		const album = albums.find((a) => a.localId === localId);
		if (album) {
			await removeMediaFiles(mediaPathsOf(album));
		}
		await writeIndex(albums.filter((a) => a.localId !== localId));
	});
}

export async function writeMediaFile(
	path: string,
	bytes: Uint8Array,
): Promise<void> {
	await writeAppDataFileAtomic({
		path: albumMediaPath(path),
		content: bytes,
	});
}

/**
 * Read a stored media file as an object URL. The caller owns the URL and must
 * revoke it with URL.revokeObjectURL when done.
 */
export async function savedMediaUrl(
	path: string,
	contentType: string,
): Promise<string | null> {
	const mediaPath = albumMediaPath(path);
	if (!(await existsAppDataFile(mediaPath))) return null;
	const bytes = await readAppDataFile(mediaPath);
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return URL.createObjectURL(new Blob([copy], { type: contentType }));
}

/** Fetch media bytes through the native media proxy (an ogmedia URL). */
export async function downloadMediaBytes(
	proxiedUrl: string,
): Promise<Uint8Array> {
	let lastError: unknown;
	// The first request can lose a race with the proxy warming up; once more is
	// enough to tell a hiccup from a file that really can't be fetched.
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			return await fetchWholeBody(proxiedUrl);
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchWholeBody(proxiedUrl: string): Promise<Uint8Array> {
	const response = await fetch(proxiedUrl);
	if (!response.ok) {
		throw new Error(`Media fetch failed with status ${response.status}`);
	}
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.byteLength === 0) throw new Error("Media fetch returned no data");

	// A truncated file would be saved as if it were complete, so a body that
	// doesn't match what the server said it would send is refused.
	const declared = Number(response.headers.get("content-length"));
	if (
		Number.isFinite(declared) &&
		declared > 0 &&
		declared !== bytes.byteLength
	) {
		throw new Error(
			`Media fetch was cut short (${bytes.byteLength} of ${declared} bytes)`,
		);
	}
	const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
		response.headers.get("content-range") ?? "",
	);
	if (response.status === 206 && range !== null) {
		const total = Number(range[3]);
		if (Number(range[1]) !== 0 || bytes.byteLength !== total) {
			throw new Error("Media fetch returned only part of the file");
		}
	}
	return bytes;
}
