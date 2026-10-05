import z from "zod";

/** What the map draws underneath the pins: the street map or satellite photos. */
export const baseLayerSchema = z.enum(["standard", "satellite"]);
export type BaseLayerKind = z.infer<typeof baseLayerSchema>;

export const DEFAULT_BASE_LAYER: BaseLayerKind = "standard";

export type BaseLayerDefinition = {
	/** Tile address; the host must be allowed by the `img-src` of the Tauri CSP. */
	url: string;
	attribution: string;
	maxZoom: number;
	/** Deeper zoom levels reuse the tiles of this one, scaled up. */
	maxNativeZoom?: number;
};

const link = (href: string, text: string): string =>
	`<a href="${href}" target="_blank" rel="noreferrer nofollow noopener">${text}</a>`;

export const BASE_LAYERS: Record<BaseLayerKind, BaseLayerDefinition> = {
	standard: {
		url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
		attribution: `&copy; ${link("https://www.openstreetmap.org/copyright", "OpenStreetMap")} &nbsp;`,
		maxZoom: 19,
	},
	// Esri's public World Imagery service. Its rows come before its columns in
	// the address ({y}/{x}). It answers deep zoom levels over thinly covered
	// areas with a "not yet available" picture, so the last level is scaled up
	// instead of asked for.
	satellite: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution: `&copy; ${link("https://www.esri.com", "Esri")}, Maxar, Earthstar Geographics, and the GIS User Community &nbsp;`,
		maxZoom: 19,
		maxNativeZoom: 18,
	},
};

export function otherBaseLayer(kind: BaseLayerKind): BaseLayerKind {
	return kind === "satellite" ? "standard" : "satellite";
}
