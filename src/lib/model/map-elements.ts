import z from "zod";

export const MAX_TITLE_LENGTH = 80;

export const mapMarkerSchema = z.object({
	id: z.string().min(1),
	latitude: z.number().gte(-90).lte(90),
	longitude: z.number().gte(-180).lte(180),
	title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
	createdAt: z.string().min(1),
	/** Linked profile when this pin was created by triangulation */
	profileId: z.number().int().positive().optional(),
	/** Public media hash for the profile thumbnail on the map pin */
	mediaHash: z.string().optional(),
	displayName: z.string().max(80).optional(),
});

export const mapElementsFileSchema = z.object({
	version: z.literal(1),
	markers: z.array(mapMarkerSchema).default([]),
});

export type MapMarker = z.infer<typeof mapMarkerSchema>;
export type MapElementsFile = z.infer<typeof mapElementsFileSchema>;

export type InteractionMode =
	| "NORMAL"
	| "ADD_MARKER"
	| "MARKER_CONFIGURATION"
	| "SELECTED_MARKER";

export type MarkerDraft = {
	latitude: number;
	longitude: number;
	title: string;
};

export function emptyMapElementsFile(): MapElementsFile {
	return { version: 1, markers: [] };
}

export function parseMapElementsFile(raw: unknown): MapElementsFile {
	const parsed = mapElementsFileSchema.safeParse(raw);
	if (!parsed.success) return emptyMapElementsFile();
	return parsed.data;
}
