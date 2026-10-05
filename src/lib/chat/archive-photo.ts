import {
	type SavedAlbum,
	type SavedAlbumProfileSnapshot,
} from "$lib/model/messaging/saved-albums";
import { proxyMediaUrl } from "$lib/util/media";
import {
	downloadMediaBytes,
	mediaFileName,
	removeMediaFiles,
	upsertSavedAlbum,
	writeMediaFile,
} from "./saved-album-library";

/** Id local de una foto guardada: una misma foto no se guarda dos veces. */
export function savedPhotoLocalId({
	conversationId,
	mediaId,
}: {
	conversationId: string;
	mediaId: number;
}): string {
	return `photo:${conversationId}:${mediaId}`;
}

/**
 * Guarda una foto recibida en la biblioteca local. Solo se llama desde una
 * acción explícita del usuario sobre un mensaje de foto normal (nunca de las
 * efímeras, que no se pueden conservar).
 */
export type SavablePhoto = {
	messageId: string;
	senderId: number | null;
	timestamp: number | null;
	mediaId: number;
	url: string;
};

export async function savePhotoToLibrary({
	photo,
	conversationId,
	profileSnapshot,
}: {
	photo: SavablePhoto;
	conversationId: string;
	profileSnapshot: SavedAlbumProfileSnapshot;
}): Promise<SavedAlbum> {
	const mediaId = photo.mediaId;
	const storageId = crypto.randomUUID();
	const bytes = await downloadMediaBytes(
		proxyMediaUrl(photo.url, { as: "image" }),
	);
	const localPath = mediaFileName(storageId, String(mediaId), "image/jpeg");
	await writeMediaFile(localPath, bytes);

	const now = Date.now();
	const record: SavedAlbum = {
		localId: savedPhotoLocalId({ conversationId, mediaId }),
		storageId,
		albumId: 0,
		messageId: photo.messageId,
		conversationId,
		senderId: photo.senderId,
		createdAt: photo.timestamp ?? now,
		savedAt: now,
		sourceTemporary: false,
		expiresAt: null,
		profileSnapshot,
		coverPath: localPath,
		items: [
			{
				contentId: mediaId,
				contentType: "image/jpeg",
				localPath,
				thumbnailPath: null,
			},
		],
		kind: "photo",
		sizeBytes: bytes.byteLength,
		tags: [],
		favorite: false,
		hidden: false,
	};
	try {
		await upsertSavedAlbum(record);
	} catch (error) {
		await removeMediaFiles([localPath]);
		throw error;
	}
	return record;
}
