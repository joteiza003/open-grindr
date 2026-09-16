import { getAlbumContent } from "$lib/api/messaging/albums";
import {
	type SavedAlbum,
	savedAlbumLocalId,
	type SavedAlbumProfileSnapshot,
} from "$lib/model/messaging/saved-albums";
import { proxyMediaUrl } from "$lib/util/media";
import type { AlbumMessage } from "$lib/model/messaging/messages";
import {
	downloadMediaBytes,
	mediaFileName,
	upsertSavedAlbum,
	writeMediaFile,
} from "./saved-album-library";

type AlbumBody = AlbumMessage["body"];

/**
 * Save an album the user is viewing into the local library. This is only ever
 * called from an explicit user action (e.g. a "Save" button in the viewer),
 * never automatically. It fetches the album while it is still accessible,
 * downloads each media file's bytes through the native media proxy, and stores
 * them alongside a snapshot of the sender so the album stays usable and
 * filterable even after the original expires.
 */
export async function saveAlbumToLibrary({
	body,
	conversationId,
	profileSnapshot,
}: {
	body: AlbumBody;
	conversationId: string;
	profileSnapshot: SavedAlbumProfileSnapshot;
}): Promise<SavedAlbum> {
	const album = await getAlbumContent(body.albumId);
	const storageId = crypto.randomUUID();

	const items: SavedAlbum["items"] = [];
	for (const slide of album.content) {
		if (!slide.url) continue;
		const kind = slide.contentType.startsWith("video/") ? "video" : "image";
		const bytes = await downloadMediaBytes(
			proxyMediaUrl(slide.url, { as: kind }),
		);
		const localPath = mediaFileName(
			storageId,
			String(slide.contentId),
			slide.contentType,
		);
		await writeMediaFile(localPath, bytes);

		let thumbnailPath: string | null = null;
		try {
			const thumbBytes = await downloadMediaBytes(
				proxyMediaUrl(slide.thumbUrl),
			);
			thumbnailPath = mediaFileName(
				storageId,
				`${slide.contentId}_thumb`,
				"image/jpeg",
			);
			await writeMediaFile(thumbnailPath, thumbBytes);
		} catch (error) {
			console.error("[album-library] thumbnail save failed", error);
		}

		items.push({
			contentId: slide.contentId,
			contentType: slide.contentType,
			localPath,
			thumbnailPath,
		});
	}

	if (items.length === 0) {
		throw new Error("This album has no downloadable media");
	}

	let coverPath: string | null = null;
	const proxiedCover = proxyMediaUrl(body.coverUrl);
	if (proxiedCover !== null) {
		try {
			const coverBytes = await downloadMediaBytes(proxiedCover);
			coverPath = mediaFileName(storageId, "cover", "image/jpeg");
			await writeMediaFile(coverPath, coverBytes);
		} catch (error) {
			console.error("[album-library] cover save failed", error);
		}
	}

	const temporary =
		(body.expirationType !== null &&
			body.expirationType !== undefined &&
			body.expirationType !== "INDEFINITE") ||
		body.expiresAt !== null;

	const record: SavedAlbum = {
		localId: savedAlbumLocalId({ conversationId, albumId: body.albumId }),
		storageId,
		albumId: body.albumId,
		messageId: "",
		conversationId,
		senderId: body.ownerProfileId,
		createdAt: Date.now(),
		savedAt: Date.now(),
		sourceTemporary: temporary,
		expiresAt: body.expiresAt ?? null,
		profileSnapshot,
		coverPath,
		items,
		tags: [],
		favorite: false,
		hidden: false,
	};

	await upsertSavedAlbum(record);
	return record;
}
