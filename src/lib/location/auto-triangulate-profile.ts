/**
 * Fully automatic profile triangulation.
 *
 * Flow:
 *  1. Read current geohash (home).
 *  2. Build two fictitious observer positions ~1.2 km away at 0° and 120°.
 *  3. For each of the three positions: updateLocation → refreshProfile → read distance.
 *  4. Restore home location.
 *  5. Run robustTrilateration.
 *  6. Persist a map marker and return the result.
 */

import { updateLocation } from "$lib/api/browse/location";
import { refreshProfile } from "$lib/api/users/profiles";
import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import { destinationPoint } from "$lib/map/geographic";
import { addMarker } from "$lib/map/map-elements-library";
import { decodeGeohash, encodeGeohash } from "$lib/model/geohash";
import { autoLocation } from "./auto-location";
import type { Coordinates } from "./location-request.svelte";
import { type Measurement, robustTrilateration } from "./trilateration";

/** Baseline distance between observer positions (metres). */
const BASELINE_M = 1_200;

/** Bearings for the two fictitious positions relative to home (degrees). */
const OFFSET_BEARINGS = [0, 120] as const;

/** Small pause so the server has time to accept the new location. */
const SETTLE_MS = 400;

export type AutoTriangulateProgress =
	| { step: "starting" }
	| { step: "measuring"; index: number; total: number }
	| { step: "computing" }
	| { step: "restoring" }
	| { step: "done" }
	| { step: "error"; message: string };

export type AutoTriangulateResult = {
	point: Coordinates;
	error: number;
	residuals: number[];
	markerId: string;
	measurements: Measurement[];
};

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function observerPositions(
	home: Coordinates,
): [Coordinates, Coordinates, Coordinates] {
	const a = home;
	const b = destinationPoint(
		{ latitude: home.lat, longitude: home.lon },
		OFFSET_BEARINGS[0],
		BASELINE_M,
	);
	const c = destinationPoint(
		{ latitude: home.lat, longitude: home.lon },
		OFFSET_BEARINGS[1],
		BASELINE_M,
	);
	return [
		a,
		{ lat: b.latitude, lon: b.longitude },
		{ lat: c.latitude, lon: c.longitude },
	];
}

async function setServerAndLocalLocation(geohash: string): Promise<void> {
	await updateLocation({ geohash });
	await setPreferences({ geohash, autoUpdateLocation: false });
	await sleep(SETTLE_MS);
}

async function measureDistanceAt({
	profileId,
	position,
}: {
	profileId: number;
	position: Coordinates;
}): Promise<number> {
	const geohash = encodeGeohash(position);
	await setServerAndLocalLocation(geohash);
	const profile = await refreshProfile(profileId);
	const distance = profile.distance;
	if (distance === null || !Number.isFinite(distance) || distance < 0) {
		throw new Error(
			"El perfil no devolvió distancia en esta posición (puede estar oculto o fuera de rango).",
		);
	}
	return distance;
}

/**
 * Triangulate a single profile automatically and drop a marker on the map.
 */
export async function autoTriangulateProfile({
	profileId,
	displayName,
	onProgress,
}: {
	profileId: number;
	displayName?: string | null;
	onProgress?: (p: AutoTriangulateProgress) => void;
}): Promise<AutoTriangulateResult> {
	const homeGeohash = preferencesSnapshot().geohash;
	if (!homeGeohash) {
		throw new Error(
			"No hay ubicación activa. Configura tu posición primero.",
		);
	}

	const homeDecoded = decodeGeohash(homeGeohash);
	const home: Coordinates = { lat: homeDecoded.lat, lon: homeDecoded.lon };
	const positions = observerPositions(home);
	const total = positions.length;

	autoLocation.suspend();
	onProgress?.({ step: "starting" });

	const measurements: Measurement[] = [];
	let restoreError: unknown = null;

	try {
		for (let i = 0; i < positions.length; i++) {
			onProgress?.({ step: "measuring", index: i + 1, total });
			const position = positions[i]!;
			const distance = await measureDistanceAt({ profileId, position });
			measurements.push({ position, distance });
		}

		onProgress?.({ step: "computing" });
		const result = robustTrilateration(measurements);
		if (!result) {
			throw new Error(
				"No se pudo calcular la posición (geometría inválida).",
			);
		}

		const title =
			displayName && displayName.trim().length > 0
				? `△ ${displayName.trim()}`
				: `△ Perfil #${profileId}`;

		const markerId = `triangulated-${profileId}-${Date.now()}`;
		const marker = {
			id: markerId,
			latitude: result.point.lat,
			longitude: result.point.lon,
			title,
			createdAt: new Date().toISOString(),
		};
		await addMarker(marker);

		return {
			point: result.point,
			error: result.error,
			residuals: result.residuals,
			markerId,
			measurements,
		};
	} finally {
		onProgress?.({ step: "restoring" });
		try {
			await setServerAndLocalLocation(homeGeohash);
		} catch (error) {
			restoreError = error;
			console.error(
				"Failed to restore home location after triangulation",
				error,
			);
		}
		autoLocation.resume();
		if (restoreError) {
			// Still surface the restore failure after a successful triangulation
			onProgress?.({
				step: "error",
				message:
					"Triangulación hecha, pero no se pudo restaurar tu ubicación original.",
			});
		} else {
			onProgress?.({ step: "done" });
		}
	}
}
