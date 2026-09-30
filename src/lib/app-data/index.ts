import { invoke, isTauri } from "@tauri-apps/api/core";

import { toBase64 } from "$lib/util/base64";
import {
	existsWebAppDataFile,
	readWebAppDataFile,
	removeWebAppDataFile,
	writeWebAppDataFile,
} from "./web-store";

// The native side accepts a closed set of files (see app_data.rs). Every
// fixed file is named here; album media is the one dynamic family.
const nativeFiles = {
	"preferences.data": "preferences",
	"profile-metadata.data": "profileMetadata",
	"chat-background.data": "chatBackground",
	"frequent-phrases.json": "frequentPhrases",
	"chat-photo-albums.json": "chatPhotoAlbums",
	"album-library-index.json": "albumLibraryIndex",
	"location-map-index.json": "locationMapIndex",
	"map-elements.json": "mapElements",
} as const;

export type AlbumMediaPath = `album-media__${string}`;

type AppDataPath = keyof typeof nativeFiles | AlbumMediaPath;

function nativeName(path: AppDataPath): string {
	return Object.hasOwn(nativeFiles, path)
		? nativeFiles[path as keyof typeof nativeFiles]
		: path;
}

async function readNativeFile(path: AppDataPath) {
	const bytes = await invoke<ArrayBuffer | number[] | null>("read_app_data", {
		file: nativeName(path),
	});
	return bytes === null ? null : new Uint8Array(bytes);
}

export async function existsAppDataFile(path: AppDataPath) {
	if (!isTauri()) return existsWebAppDataFile(path);
	return (await readNativeFile(path)) !== null;
}

export async function readAppDataFile(path: AppDataPath) {
	if (!isTauri()) return readWebAppDataFile(path);
	const bytes = await readNativeFile(path);
	if (bytes === null) throw new Error(`No app data file at ${path}`);
	return bytes;
}

export async function removeAppDataFile(path: AppDataPath) {
	if (!isTauri()) return removeWebAppDataFile(path);
	await invoke("remove_app_data", { file: nativeName(path) });
}

export async function writeAppDataFileAtomic({
	path,
	content,
}: {
	path: AppDataPath;
	content: Uint8Array;
}) {
	if (!isTauri()) return writeWebAppDataFile({ path, content });
	await invoke("write_app_data", {
		file: nativeName(path),
		content: toBase64(content),
	});
}
