/**
 * Etiquetas de "qué busca" para el resumen del perfil: solo las que tienen
 * texto conocido, sin repetidos, y como mucho `max` (el resto se resume en `more`).
 */
export function lookingForSummary({
	ids,
	labels,
	max = 3,
}: {
	ids: readonly number[] | null | undefined;
	labels: Record<number, string>;
	max?: number;
}): { shown: string[]; more: number } {
	const known = [
		...new Set(
			(ids ?? [])
				.map((id) => labels[id])
				.filter((label): label is string => label !== undefined),
		),
	];
	return {
		shown: known.slice(0, max),
		more: Math.max(0, known.length - max),
	};
}
