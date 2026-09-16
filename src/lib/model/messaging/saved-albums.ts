import z from "zod";

/**
 * Local, user-owned library of albums the user has explicitly chosen to save.
 *
 * This is deliberately separate from `albums.ts` (which models Grindr's album
 * objects). Saving is always an explicit, per-album action taken by the user
 * while viewing an album — there is no silent/automatic archiving. Because a
 * shared album (especially an expiring one) can only be fetched while it is
 * still accessible, a saved album keeps its own copy of the media bytes plus a
 * snapshot of the sender, so it stays usable and filterable after the original
 * is gone.
 */

export const savedAlbumItemSchema = z.object({
	contentId: z.number(),
	contentType: z.string(),
	/** App-data relative path of the saved media file. */
	localPath: z.string(),
	/** App-data relative path of the saved thumbnail, if any. */
	thumbnailPath: z.string().nullable().default(null),
	width: z.number().optional(),
	height: z.number().optional(),
});

export type SavedAlbumItem = z.infer<typeof savedAlbumItemSchema>;

export const savedAlbumProfileSnapshotSchema = z.object({
	profileId: z.number().nullable().default(null),
	displayName: z.string().nullable().default(null),
	age: z.number().nullable().default(null),
	distance: z.number().nullable().default(null),
});

export type SavedAlbumProfileSnapshot = z.infer<
	typeof savedAlbumProfileSnapshotSchema
>;

export const savedAlbumSchema = z.object({
	/** Stable dedupe key: `${conversationId}:${albumId}`. */
	localId: z.string(),
	/** Filename-safe id used to name this album's stored media files. */
	storageId: z.string(),

	albumId: z.number(),
	messageId: z.string().default(""),
	conversationId: z.string(),
	senderId: z.number().nullable().default(null),

	createdAt: z.number(),
	savedAt: z.number(),

	sourceTemporary: z.boolean().default(false),
	expiresAt: z.number().nullable().default(null),

	profileSnapshot: savedAlbumProfileSnapshotSchema,

	coverPath: z.string().nullable().default(null),
	items: z.array(savedAlbumItemSchema).default([]),

	tags: z.array(z.string()).default([]),
	favorite: z.boolean().default(false),
	hidden: z.boolean().default(false),
});

export type SavedAlbum = z.infer<typeof savedAlbumSchema>;

export const savedAlbumsFileSchema = z.object({
	version: z.literal(1),
	albums: z.array(savedAlbumSchema).default([]),
});

export function savedAlbumLocalId({
	conversationId,
	albumId,
}: {
	conversationId: string;
	albumId: number;
}): string {
	return `${conversationId}:${albumId}`;
}
