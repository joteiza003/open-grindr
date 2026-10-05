export type RangeLimits = { floor: number; ceiling: number };

/**
 * Aplica un valor escrito a mano a uno de los extremos del rango.
 *
 * `null` (campo vacío) quita ese extremo. El valor se acota a los límites y se
 * redondea; si cruza al otro extremo, arrastra al otro para que siempre se
 * cumpla mínimo ≤ máximo.
 */
export function applyBound({
	range,
	limits: { floor, ceiling },
	which,
	typed,
}: {
	range: readonly number[];
	limits: RangeLimits;
	which: "min" | "max";
	typed: number | null;
}): [number, number] {
	let [min = floor, max = ceiling] = range;
	const bound =
		typed === null || !Number.isFinite(typed)
			? which === "min"
				? floor
				: ceiling
			: Math.min(ceiling, Math.max(floor, Math.round(typed)));
	if (which === "min") {
		min = bound;
		if (max < min) max = min;
	} else {
		max = bound;
		if (min > max) min = max;
	}
	return [min, max];
}

/** Lee lo escrito (admite coma decimal); vacío o ilegible → `null`. */
export function parseTyped(text: string): number | null {
	const trimmed = text.trim().replace(",", ".");
	if (trimmed === "") return null;
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : null;
}
