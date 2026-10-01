import type { GridProfile, RenderedGridProfile } from "./grid";

export const TINDER_RADIUS_OPTIONS_KM = [1, 2, 5, 10, 25, 50, 100] as const;

/** Mensajes que se envían al aceptar un perfil, en este orden. */
export const GREETING_MESSAGES = ["Hola", "¿Qué tal?"] as const;

/**
 * Clave de orden aleatoria y estable por perfil: se sortea la primera vez que
 * se ve y se recuerda, para que la baraja no se reordene en cada cambio.
 */
export function randomOrderKey(
	keys: Map<number, number>,
	id: number,
	random: () => number = Math.random,
): number {
	let key = keys.get(id);
	if (key === undefined) {
		key = random();
		keys.set(id, key);
	}
	return key;
}

/**
 * Perfiles de la baraja: ya cargados, con foto, dentro del radio y aún sin
 * decidir. Salen en orden aleatorio (no por distancia) si se pasa `keys`.
 */
export function tinderCandidates({
	profiles,
	radiusKm,
	decided,
	keys,
}: {
	profiles: readonly GridProfile[];
	radiusKm: number;
	decided: ReadonlySet<number>;
	keys?: Map<number, number>;
}): RenderedGridProfile[] {
	const radiusMeters = radiusKm * 1000;
	const inside = profiles.filter(
		(profile): profile is RenderedGridProfile =>
			profile.type === "rendered" &&
			profile.distance !== null &&
			profile.distance <= radiusMeters &&
			(profile.profilePhotosHashes?.[0] ?? "") !== "" &&
			!decided.has(profile.id),
	);
	if (!keys) return inside;
	return inside.sort(
		(a, b) => randomOrderKey(keys, a.id) - randomOrderKey(keys, b.id),
	);
}

/**
 * ¿Merece la pena pedir otra página? Solo si la baraja se queda corta y lo
 * cargado aún no ha salido del radio (la lista va de más cerca a más lejos).
 */
export function needsMoreProfiles({
	profiles,
	radiusKm,
	candidateCount,
	minCandidates = 3,
}: {
	profiles: readonly GridProfile[];
	radiusKm: number;
	candidateCount: number;
	minCandidates?: number;
}): boolean {
	if (candidateCount >= minCandidates) return false;
	if (profiles.some((profile) => profile.type === "lazy")) return false;
	const radiusMeters = radiusKm * 1000;
	return !profiles.some(
		(profile) =>
			profile.type === "rendered" &&
			profile.distance !== null &&
			profile.distance > radiusMeters,
	);
}
