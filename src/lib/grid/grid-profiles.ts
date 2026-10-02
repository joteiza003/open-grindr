import type { GridProfile } from "./grid";

export function dedupeGridProfiles(
	items: readonly GridProfile[],
): GridProfile[] {
	const byId = new Map<number, GridProfile>();
	for (const item of items) {
		const existing = byId.get(item.id);
		if (
			!existing ||
			(existing.type === "lazy" && item.type === "rendered")
		) {
			byId.set(item.id, item);
		}
	}
	return [...byId.values()];
}

export function indexProfilesById(
	profiles: readonly GridProfile[],
): ReadonlyMap<number, number> {
	return new Map(profiles.map((profile, index) => [profile.id, index]));
}

function distanceOf(profile: GridProfile): number {
	return profile.type === "rendered" && profile.distance !== null
		? profile.distance
		: Number.POSITIVE_INFINITY;
}

/**
 * Closest first. Grindr's cascade can come back shuffled once filters are
 * applied, interleaving near and far. Profiles that have not resolved yet carry
 * no distance, so they go last until they do; the sort is stable, so equal
 * distances keep the server's order.
 *
 * This is the one order everything shares: the grid, the row revealed when you
 * come back from a profile, and the profile pager's neighbours.
 */
export function sortGridProfilesByDistance(
	profiles: readonly GridProfile[],
): GridProfile[] {
	return [...profiles].sort((a, b) => distanceOf(a) - distanceOf(b));
}
