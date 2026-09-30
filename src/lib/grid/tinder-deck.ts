import type { GridProfile, RenderedGridProfile } from "./grid";

export const TINDER_RADIUS_OPTIONS_KM = [1, 2, 5, 10, 25, 50, 100] as const;

/** Mensajes que se envían al aceptar un perfil, en este orden. */
export const GREETING_MESSAGES = ["Hola", "¿Qué tal?"] as const;

/**
 * Perfiles de la baraja: ya cargados, dentro del radio y aún sin decidir.
 * Conserva el orden de entrada (la rejilla ya va de más cerca a más lejos).
 */
export function tinderCandidates({
	profiles,
	radiusKm,
	decided,
}: {
	profiles: readonly GridProfile[];
	radiusKm: number;
	decided: ReadonlySet<number>;
}): RenderedGridProfile[] {
	const radiusMeters = radiusKm * 1000;
	return profiles.filter(
		(profile): profile is RenderedGridProfile =>
			profile.type === "rendered" &&
			profile.distance !== null &&
			profile.distance <= radiusMeters &&
			!decided.has(profile.id),
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
