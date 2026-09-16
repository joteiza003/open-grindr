import {
	existsAppDataFile,
	readAppDataFile,
	removeAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";

/**
 * Storage for the user's chat background photo. Reuses the existing app-data
 * engine (its own file), never the preferences blob. The preferences only
 * record that a photo is in use (`chat.background.kind === "photo"`); the bytes
 * live here.
 *
 * Images are downscaled before saving so a wallpaper never bloats storage or
 * chat scrolling performance.
 */

const FILE = "chat-background.data";
const MAX_DIMENSION = 1600;
const OUTPUT_TYPE = "image/webp";
const OUTPUT_QUALITY = 0.85;

async function downscale(file: File): Promise<Uint8Array> {
	// Decode straight from the File. createImageBitmap avoids an <img> + object
	// URL, which the app's Content-Security-Policy would otherwise gate.
	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(
			1,
			MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
		);
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas is unavailable");
		context.drawImage(bitmap, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
		});
		if (!blob) throw new Error("Could not encode image");
		return new Uint8Array(await blob.arrayBuffer());
	} finally {
		bitmap.close();
	}
}

export async function storeChatBackgroundPhoto(file: File): Promise<void> {
	const bytes = await downscale(file);
	await writeAppDataFileAtomic({ path: FILE, content: bytes });
}

export async function hasChatBackgroundPhoto(): Promise<boolean> {
	return existsAppDataFile(FILE);
}

/**
 * Load the stored photo as an object URL, or null if none. The caller owns the
 * URL and must revoke it with `URL.revokeObjectURL` when done.
 */
export async function loadChatBackgroundUrl(): Promise<string | null> {
	if (!(await existsAppDataFile(FILE))) return null;
	const bytes = await readAppDataFile(FILE);
	// Copy into an ArrayBuffer-backed view so the bytes are a valid BlobPart.
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return URL.createObjectURL(new Blob([copy], { type: OUTPUT_TYPE }));
}

export async function clearChatBackgroundPhoto(): Promise<void> {
	await removeAppDataFile(FILE);
}
