import type { MapMarker } from "$lib/model/map-elements";

/**
 * DOM for the things drawn on the map. Built once per item and kept for as
 * long as the item exists, so changing what is selected only flips a class:
 * nothing is rebuilt and no image is requested twice.
 */
export type PinContent = {
	root: HTMLElement;
	/** Profile photo, when the pin has one. Its `src` is set by `PinPhoto`. */
	image: HTMLImageElement | null;
	iconSize: [number, number];
	iconAnchor: [number, number];
};

const PIN_PATH =
	"M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z";

function element<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	return node;
}

function pinSvg(): SVGSVGElement {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 256 256");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("class", "og-pin__svg");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", PIN_PATH);
	svg.append(path);
	return svg;
}

export function pinLabel(marker: MapMarker): string {
	return marker.displayName ?? marker.title;
}

/** First letter of the pin's name, shown until (or instead of) the photo. */
export function pinInitial(marker: MapMarker): string {
	const name = pinLabel(marker).replace(/^[^\p{L}\p{N}]+/u, "");
	return (name.charAt(0) || "?").toLocaleUpperCase();
}

export function isProfileMarker(marker: MapMarker): boolean {
	return marker.profileId !== undefined || Boolean(marker.mediaHash);
}

/** Round avatar for a pin that belongs to a profile. */
export function profilePinContent(marker: MapMarker): PinContent {
	const root = element("div", "og-pin og-pin--avatar");
	const disc = element("div", "og-pin__disc");
	const initial = element("span", "og-pin__initial");
	initial.textContent = pinInitial(marker);
	disc.append(initial);

	let image: HTMLImageElement | null = null;
	if (marker.mediaHash) {
		image = element("img", "og-pin__photo");
		image.alt = "";
		image.draggable = false;
		image.decoding = "async";
		disc.append(image);
	}
	root.append(disc);
	return { root, image, iconSize: [44, 44], iconAnchor: [22, 22] };
}

/** Plain map pin for a saved place. */
export function placePinContent(): PinContent {
	const root = element("div", "og-pin og-pin--place");
	root.append(pinSvg());
	return { root, image: null, iconSize: [36, 36], iconAnchor: [18, 36] };
}

/** Map pin for a location somebody shared in a chat. */
export function sharedPinContent(): PinContent {
	const root = element("div", "og-pin og-pin--shared");
	root.append(pinSvg());
	return { root, image: null, iconSize: [40, 40], iconAnchor: [20, 40] };
}

/** The user's own custom position. */
export function mePinContent(): PinContent {
	const root = element("div", "og-pin og-pin--me");
	root.append(element("span", "og-pin__dot"));
	return { root, image: null, iconSize: [28, 28], iconAnchor: [14, 14] };
}

/** Badge that stands for several pins close together. */
export function clusterContent(count: number): PinContent {
	const root = element("div", "og-pin og-pin--cluster");
	const badge = element("span", "og-pin__count");
	badge.textContent = String(count);
	root.append(badge);
	const size = count > 9 ? 44 : 40;
	return {
		root,
		image: null,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
	};
}
