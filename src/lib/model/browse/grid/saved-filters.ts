import z from "zod";

import { gridSearchFiltersSchema } from "./filters";

/** Máximo de filtros guardados: cada uno cuesta una consulta al abrir la app. */
export const MAX_SAVED_FILTERS = 5;
/** Perfiles vistos que se recuerdan por filtro (los más antiguos se olvidan). */
export const MAX_SEEN_PER_FILTER = 400;
export const MAX_SAVED_FILTER_NAME = 40;

export const savedFilterSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(MAX_SAVED_FILTER_NAME),
	filters: gridSearchFiltersSchema,
	/** Perfiles que ya viste con este filtro: lo demás cuenta como nuevo. */
	seenIds: z.array(z.int().positive()).max(MAX_SEEN_PER_FILTER).default([]),
	/**
	 * Falso hasta la primera consulta: esa solo fija el punto de partida, para
	 * no anunciar como "nuevos" todos los perfiles que ya había.
	 */
	baselineSet: z.boolean().default(false),
});

export type SavedFilter = z.infer<typeof savedFilterSchema>;

export type SaveFilterProblem = "empty-name" | "too-many" | "duplicate-name";

/** Añade un filtro nuevo o explica por qué no se puede. */
export function addSavedFilter({
	list,
	name,
	filters,
	id,
}: {
	list: readonly SavedFilter[];
	name: string;
	filters: SavedFilter["filters"];
	id: string;
}):
	| { ok: true; list: SavedFilter[] }
	| { ok: false; problem: SaveFilterProblem } {
	const trimmed = name.trim().slice(0, MAX_SAVED_FILTER_NAME);
	if (trimmed === "") return { ok: false, problem: "empty-name" };
	if (list.length >= MAX_SAVED_FILTERS) {
		return { ok: false, problem: "too-many" };
	}
	const taken = list.some(
		(item) => item.name.toLowerCase() === trimmed.toLowerCase(),
	);
	if (taken) return { ok: false, problem: "duplicate-name" };
	return {
		ok: true,
		list: [
			...list,
			{
				id,
				name: trimmed,
				filters: structuredClone(filters),
				seenIds: [],
				baselineSet: false,
			},
		],
	};
}

/** Ids de `ids` que aún no se han visto con este filtro, sin repetidos. */
export function newIdsFor(
	saved: Pick<SavedFilter, "seenIds" | "baselineSet">,
	ids: readonly number[],
): number[] {
	if (!saved.baselineSet) return [];
	const seen = new Set(saved.seenIds);
	return [...new Set(ids)].filter((id) => !seen.has(id));
}

/** Marca `ids` como vistos; si hay demasiados, se olvidan los más antiguos. */
export function markSeen(
	saved: SavedFilter,
	ids: readonly number[],
	max = MAX_SEEN_PER_FILTER,
): SavedFilter {
	const merged = [...saved.seenIds];
	const present = new Set(merged);
	for (const id of ids) {
		if (!present.has(id)) {
			present.add(id);
			merged.push(id);
		}
	}
	return {
		...saved,
		baselineSet: true,
		seenIds:
			merged.length > max ? merged.slice(merged.length - max) : merged,
	};
}
