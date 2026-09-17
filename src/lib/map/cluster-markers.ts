import type { MapMarker } from "$lib/model/map-elements";
import { distanceMeters, metersPerPixel } from "./geographic";

export type MarkerCluster =
	| { type: "single"; marker: MapMarker }
	| {
			type: "group";
			id: string;
			latitude: number;
			longitude: number;
			markers: MapMarker[];
	  };

const CLUSTER_PIXEL_RADIUS = 48;
const NO_CLUSTER_ZOOM = 17;

export function clusterMarkers(
	markers: MapMarker[],
	zoom: number,
	pixelRadius = CLUSTER_PIXEL_RADIUS,
): MarkerCluster[] {
	if (markers.length === 0) return [];
	if (zoom >= NO_CLUSTER_ZOOM) {
		return markers.map((marker) => ({ type: "single", marker }));
	}

	const remaining = [...markers];
	const clusters: MarkerCluster[] = [];

	while (remaining.length > 0) {
		const seed = remaining.shift()!;
		const threshold = metersPerPixel(seed.latitude, zoom) * pixelRadius;
		const members: MapMarker[] = [seed];

		for (let i = remaining.length - 1; i >= 0; i -= 1) {
			const candidate = remaining[i]!;
			if (
				distanceMeters(
					{ latitude: seed.latitude, longitude: seed.longitude },
					{
						latitude: candidate.latitude,
						longitude: candidate.longitude,
					},
				) <= threshold
			) {
				members.push(candidate);
				remaining.splice(i, 1);
			}
		}

		if (members.length === 1) {
			clusters.push({ type: "single", marker: seed });
			continue;
		}

		const latitude =
			members.reduce((sum, item) => sum + item.latitude, 0) /
			members.length;
		const longitude =
			members.reduce((sum, item) => sum + item.longitude, 0) /
			members.length;
		clusters.push({
			type: "group",
			id: `cluster-${members
				.map((item) => item.id)
				.toSorted()
				.join("-")}`,
			latitude,
			longitude,
			markers: members,
		});
	}

	return clusters;
}
