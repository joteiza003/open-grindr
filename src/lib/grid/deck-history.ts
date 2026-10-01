/** Decisiones del carrusel que se pueden deshacer (el saludo enviado no). */
export type UndoableKind = "reject" | "skip" | "like";

export type UndoableDecision = { id: number; kind: UndoableKind };

/** Cuántas decisiones recientes se pueden deshacer. */
export const MAX_UNDO_HISTORY = 20;

/** Añade una decisión al final y recorta a las últimas `max`. */
export function pushUndo(
	history: readonly UndoableDecision[],
	decision: UndoableDecision,
	max = MAX_UNDO_HISTORY,
): UndoableDecision[] {
	const next = [
		...history.filter((entry) => entry.id !== decision.id),
		decision,
	];
	return next.length > max ? next.slice(next.length - max) : next;
}

/** Saca la última decisión, o `null` si no hay ninguna. */
export function popUndo(
	history: readonly UndoableDecision[],
): { decision: UndoableDecision; rest: UndoableDecision[] } | null {
	const decision = history.at(-1);
	if (!decision) return null;
	return { decision, rest: history.slice(0, -1) };
}

/** Pone `firstId` el primero si está entre los candidatos; el resto no cambia. */
export function withFirst<T extends { id: number }>(
	candidates: readonly T[],
	firstId: number | null,
): readonly T[] {
	if (firstId === null) return candidates;
	const index = candidates.findIndex((candidate) => candidate.id === firstId);
	if (index <= 0) return candidates;
	const chosen = candidates[index];
	if (!chosen) return candidates;
	return [chosen, ...candidates.filter((_, i) => i !== index)];
}
