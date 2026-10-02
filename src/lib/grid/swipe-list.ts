/** Tope de ids guardados por lista: se descartan los más antiguos. */
export const MAX_SWIPE_DECISIONS = 5000;

/** Añade `id` al final (sin duplicados) y recorta a los últimos `max`. */
export function appendDecision(
	ids: readonly number[],
	id: number,
	max = MAX_SWIPE_DECISIONS,
): number[] {
	const next = ids.includes(id) ? [...ids] : [...ids, id];
	return next.length > max ? next.slice(next.length - max) : next;
}
