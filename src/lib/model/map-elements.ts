import z from "zod";

export const MIN_RADIUS_KM = 0.1;
export const MAX_RADIUS_KM = 200;
export const DEFAULT_RADIUS_KM = 5;
export const MAX_TITLE_LENGTH = 80;

export const CIRCLE_COLORS = [
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#3b82f6",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#fafafa",
] as const;

export const DEFAULT_CIRCLE_COLOR = CIRCLE_COLORS[0];

export const hexColorSchema = z
	.string()
	.regex(/^#([0-9a-fA-F]{6})$/, "Invalid color");

export const mapCircleSchema = z.object({
	id: z.string().min(1),
	latitude: z.number().gte(-90).lte(90),
	longitude: z.number().gte(-180).lte(180),
	radiusKm: z.number().gt(0).gte(MIN_RADIUS_KM).lte(MAX_RADIUS_KM),
	color: hexColorSchema,
	createdAt: z.string().min(1),
	name: z.string().max(80).optional(),
});

export const mapMarkerSchema = z.object({
	id: z.string().min(1),
	latitude: z.number().gte(-90).lte(90),
	longitude: z.number().gte(-180).lte(180),
	title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
	createdAt: z.string().min(1),
});

export const mapElementsFileSchema = z.object({
	version: z.literal(1),
	circles: z.array(mapCircleSchema).default([]),
	markers: z.array(mapMarkerSchema).default([]),
});

export type MapCircle = z.infer<typeof mapCircleSchema>;
export type MapMarker = z.infer<typeof mapMarkerSchema>;
export type MapElementsFile = z.infer<typeof mapElementsFileSchema>;

export type InteractionMode =
	| "NORMAL"
	| "ADD_CIRCLE"
	| "CIRCLE_CONFIGURATION"
	| "ADD_MARKER"
	| "MARKER_CONFIGURATION"
	| "SELECTED_MARKER"
	| "SELECTED_CIRCLE";

export type CircleDraft = {
	id?: string;
	latitude: number;
	longitude: number;
	radiusKm: number;
	color: string;
	name: string;
};

export type MarkerDraft = {
	latitude: number;
	longitude: number;
	title: string;
};

export function emptyMapElementsFile(): MapElementsFile {
	return { version: 1, circles: [], markers: [] };
}

export function parseMapElementsFile(raw: unknown): MapElementsFile {
	const parsed = mapElementsFileSchema.safeParse(raw);
	if (!parsed.success) return emptyMapElementsFile();
	return parsed.data;
}
