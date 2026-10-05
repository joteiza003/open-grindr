import type { GridProfile, RenderedGridProfile } from "./grid";

/** Cuántos avatares caben en la franja antes de cortar. */
export const MAX_ONLINE_FAVORITES = 12;

/**
 * Favoritos conectados ahora entre los perfiles ya cargados, en el orden que
 * traen (de más cerca a más lejos). No pide nada al servidor.
 */
export function onlineFavorites(
	profiles: readonly GridProfile[],
	now: number,
	max = MAX_ONLINE_FAVORITES,
): RenderedGridProfile[] {
	const result: RenderedGridProfile[] = [];
	for (const profile of profiles) {
		if (profile.type !== "rendered" || !profile.isFavorite) continue;
		if (profile.onlineUntil === null || profile.onlineUntil <= now)
			continue;
		result.push(profile);
		if (result.length >= max) break;
	}
	return result;
}
