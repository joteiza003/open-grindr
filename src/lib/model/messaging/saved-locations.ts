import z from "zod";

/**
 * A location another user explicitly shared with us via a `Location` chat
 * message ({ lat, lon }). These are consensual, non-ephemeral disclosures — the
 * sender chose to reveal where they are to this conversation — so we store and
 * map only what was received. Nothing here derives, triangulates, or infers a
 * position from distances; it only records shared coordinates.
 */
export const savedLocationSchema = z.object({
	/** Dedupe key: `${conversationId}:${messageId}`. */
	localId: z.string(),
	conversationId: z.string(),
	senderId: z.number().nullable().default(null),
	displayName: z.string().nullable().default(null),
	lat: z.number(),
	lon: z.number(),
	receivedAt: z.number(),
});

export type SavedLocation = z.infer<typeof savedLocationSchema>;

export const savedLocationsFileSchema = z.object({
	version: z.literal(1),
	locations: z.array(savedLocationSchema).default([]),
});
