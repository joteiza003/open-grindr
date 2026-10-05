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
});

export type PhotoAlbum = z.infer<typeof photoAlbumSchema>;

export const photoAlbumsFileSchema = z.object({
	version: z.literal(1),
	albums: z.array(photoAlbumSchema).default([]),
});

export type PhotoAlbumsFile = z.infer<typeof photoAlbumsFileSchema>;

export function emptyPhotoAlbumsFile(): PhotoAlbumsFile {
	return { version: 1, albums: [] };
}

export function parsePhotoAlbumsFile(raw: unknown): PhotoAlbum[] {
	const parsed = photoAlbumsFileSchema.safeParse(raw);
	if (!parsed.success) return [];
	return parsed.data.albums;
}
