import z from "zod";

/**
 * Virtual albums of chat-drawer media. They store references (drawer media
 * ids), never copies of the image bytes.
 */
export const photoAlbumSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(80),
	coverImageId: z.string().default(""),
	imageIds: z.array(z.string().min(1)).default([]),
	createdAt: z.string().min(1),
	dynamic: z.enum(["drawer"]).optional(),
});

export type PhotoAlbum = z.infer<typeof photoAlbumSchema>;

export const photoAlbumsFileSchema = z.object({
	version: z.literal(1),
	albums: z.array(photoAlbumSchema).default([]),
});

export type PhotoAlbumsFile = z.infer<typeof photoAlbumsFileSchema>;

export const RECENTS_ALBUM_ID = "album-recents";

export function emptyPhotoAlbumsFile(): PhotoAlbumsFile {
	return { version: 1, albums: [] };
}

export function parsePhotoAlbumsFile(raw: unknown): PhotoAlbum[] {
	const parsed = photoAlbumsFileSchema.safeParse(raw);
	if (!parsed.success) return [];
	return parsed.data.albums.filter((album) => album.id !== RECENTS_ALBUM_ID);
}

export function recentsAlbum(imageIds: string[]): PhotoAlbum {
	return {
		id: RECENTS_ALBUM_ID,
		name: "Recents",
		coverImageId: imageIds[0] ?? "",
		imageIds,
		createdAt: "1970-01-01T00:00:00.000Z",
		dynamic: "drawer",
	};
}
