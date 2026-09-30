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
 * A media slide we can persist. `url`/`thumbUrl` may already be proxied
 * (`ogmedia://…`) — `proxyMediaUrl` is a no-op on a non-https URL, so passing
 * either the raw or the proxied form is safe.
 */
export type SavableAlbumSlide = {
	contentId: number;
	contentType: string;
	url: string;
	/**
	 * The original https URL. Saving reads the whole file, so it goes through the
	 * buffering image fetcher: the video fetcher streams to a media element on
	 * Android and cannot be downloaded with `fetch`.
	 */
	sourceUrl?: string;
	thumbUrl: string;
};

/**
 * Save an album the user is viewing into the local library. This is only ever
 * called from an explicit user action (e.g. a "Save" button in the viewer),
 * never automatically. It downloads each media file's bytes through the native
 * media proxy and stores them alongside a snapshot of the sender so the album
 * stays usable and filterable even after the original expires.
 *
 * Prefer passing `content` from the already-open viewer: re-fetching a
 * single-view (ONCE) album after it has been opened can come back empty, which
 * would make the save fail. Falls back to fetching when no content is supplied.
 */
export async function saveAlbumToLibrary({
	body,
	conversationId,
	profileSnapshot,
	content,
}: {
	body: AlbumBody;
	conversationId: string;
	profileSnapshot: SavedAlbumProfileSnapshot;
	content?: SavableAlbumSlide[];
}): Promise<SavedAlbum> {
	const slides: SavableAlbumSlide[] =
		content ?? (await getAlbumContent(body.albumId)).content;
	const storageId = crypto.randomUUID();

	const items: SavedAlbum["items"] = [];
	const failures: string[] = [];
	for (const slide of slides) {
		if (!slide.url) {
			failures.push(`#${slide.contentId}: no url`);
			continue;
		}

		// One slide that fails to download must not lose the whole album; save
		// the rest and let the empty-album check below decide if nothing landed.
		let localPath: string;
		try {
			const bytes = await downloadMediaBytes(
				proxyMediaUrl(slide.sourceUrl ?? slide.url, { as: "image" }),
			);
			localPath = mediaFileName(
				storageId,
				String(slide.contentId),
				slide.contentType,
			);
			await writeMediaFile(localPath, bytes);
		} catch (error) {
			console.error("[album-library] media save failed", error);
			failures.push(
				`#${slide.contentId}: ${error instanceof Error ? error.message : String(error)}`,
			);
			continue;
		}

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
		throw new Error(
			slides.length === 0
				? "This album has no media to save"
				: `This album has no downloadable media (${failures.join("; ")})`,
		);
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
