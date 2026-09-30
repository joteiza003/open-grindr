import { divIcon } from "leaflet";

export const sharedPinIcon = divIcon({
	html: pinSvg("#ffba20", 36),
	iconAnchor: [18, 36],
	iconSize: [36, 36],
	className: "",
});

export const userPinIcon = divIcon({
	html: pinSvg("#ffba20", 40),
	iconAnchor: [20, 40],
	iconSize: [40, 40],
	className: "",
});

export const placePinIcon = divIcon({
	html: pinSvg("#e4e4e7", 28),
	iconAnchor: [14, 28],
	iconSize: [28, 28],
	className: "",
});

export const selectedPlacePinIcon = divIcon({
	html: pinSvg("#fafafa", 36),
	iconAnchor: [18, 36],
	iconSize: [36, 36],
	className: "",
});

export function clusterIcon(count: number) {
	const size = count > 9 ? 40 : 36;
	return divIcon({
		html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:#171717;border:2px solid #ffba20;color:#ffba20;display:grid;place-items:center;font:700 13px/1 'IBM Plex Sans Variable',sans-serif;box-shadow:0 8px 18px rgb(0 0 0 / 40%)">${count}</div>`,
		iconAnchor: [size / 2, size / 2],
		iconSize: [size, size],
		className: "",
	});
}

function pinSvg(fill: string, size: number): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="${fill}" stroke="#000000" stroke-width="8px" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>`;
}

export function handleIcon(color: string, size: number, ring: boolean) {
	const border = ring ? "#ffffff" : color;
	const fill = ring ? color : "#ffffff";
	return divIcon({
		html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${fill};border:3px solid ${border};box-shadow:0 2px 8px rgb(0 0 0 / 55%);cursor:grab"></div>`,
		iconAnchor: [size / 2, size / 2],
		iconSize: [size, size],
		className: "",
	});
}

export function dotIcon(color: string) {
	return divIcon({
		html: `<div style="width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 5px rgb(0 0 0 / 55%)"></div>`,
		iconAnchor: [7, 7],
		iconSize: [14, 14],
		className: "",
	});
}


/** Circular avatar pin for triangulated (or profile-linked) markers. */
export function profilePinIcon(photoUrl: string | null | undefined, selected = false) {
	const size = selected ? 44 : 36;
	const ring = selected ? "#ffba20" : "#ffffff";
	const ringW = selected ? 3 : 2;
	const img =
		photoUrl && photoUrl.length > 0
			? `<img src="${photoUrl.replace(/"/g, "&quot;")}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />`
			: `<div style="width:100%;height:100%;background:#3f3f46;display:grid;place-items:center;color:#a1a1aa;font:700 14px/1 sans-serif">?</div>`;
	return divIcon({
		html: `<div style="width:${size}px;height:${size}px;border-radius:999px;overflow:hidden;border:${ringW}px solid ${ring};box-shadow:0 4px 14px rgb(0 0 0 / 45%);background:#171717">${img}</div>`,
		iconAnchor: [size / 2, size / 2],
		iconSize: [size, size],
		className: "",
	});
}
