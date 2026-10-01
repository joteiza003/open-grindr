/**
 * Ayudas para una lista ordenada de elementos visibles tomados de un conjunto
 * cerrado (pestañas de la barra, módulos de un panel): reordenar, mostrar y
 * ocultar sin salirse del conjunto ni bajar del mínimo.
 */

/** Deja una lista válida: solo elementos permitidos, sin repetidos y con el mínimo. */
export function normalizeSubset<T extends string>({
	items,
	allowed,
	min,
	fallback,
}: {
	items: readonly unknown[];
	allowed: readonly T[];
	min: number;
	fallback: readonly T[];
}): T[] {
	const valid = new Set<T>();
	for (const item of items) {
		if (
			typeof item === "string" &&
			(allowed as readonly string[]).includes(item)
		) {
			valid.add(item as T);
		}
	}
	return valid.size >= min ? [...valid] : [...fallback];
}

/** Todos los elementos: primero los visibles (en su orden) y luego los ocultos. */
export function withHidden<T extends string>(
	visible: readonly T[],
	all: readonly T[],
): { id: T; visible: boolean }[] {
	const shown = new Set(visible);
	return [
		...visible.map((id) => ({ id, visible: true })),
		...all
			.filter((id) => !shown.has(id))
			.map((id) => ({ id, visible: false })),
	];
}

/** Mueve un elemento visible `delta` posiciones; no sale de los extremos. */
export function moveItem<T>(list: readonly T[], item: T, delta: -1 | 1): T[] {
	const from = list.indexOf(item);
	const to = from + delta;
	if (from === -1 || to < 0 || to >= list.length) return [...list];
	const next = [...list];
	next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
}

/** Muestra (al final) u oculta un elemento; ocultar no baja del mínimo. */
export function toggleItem<T>(list: readonly T[], item: T, min: number): T[] {
	if (list.includes(item)) {
		return list.length <= min
			? [...list]
			: list.filter((entry) => entry !== item);
	}
	return [...list, item];
}
