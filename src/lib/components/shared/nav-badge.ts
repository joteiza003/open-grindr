/** Tope visible de la insignia numérica de una pestaña. */
export const NAV_BADGE_CAP = 9;

/**
 * Texto de la insignia de una pestaña: nada si no hay novedades, el número
 * hasta el tope y "9+" a partir de ahí.
 */
export function navBadgeLabel(count: number): string | null {
	if (!Number.isFinite(count) || count <= 0) return null;
	const whole = Math.floor(count);
	return whole > NAV_BADGE_CAP ? `${NAV_BADGE_CAP}+` : String(whole);
}

/**
 * Qué muestra la pestaña: el número si se conoce, un punto si solo se sabe que
 * hay novedades, o nada.
 */
export function navBadge({
	count,
	pending,
}: {
	count: number;
	pending: boolean;
}): { kind: "number"; label: string } | { kind: "dot" } | null {
	const label = navBadgeLabel(count);
	if (label !== null) return { kind: "number", label };
	return pending ? { kind: "dot" } : null;
}
