import { registerAccountCache } from "$lib/api/account-caches";
import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import { getGrid } from "$lib/grid/grid";
import { buildCascadeQuery } from "$lib/grid/grid-query";
import {
	addSavedFilter,
	markSeen,
	newIdsFor,
	type SavedFilter,
	type SaveFilterProblem,
} from "$lib/model/browse/grid/saved-filters";
import type { GridSearchFilters } from "$lib/model/browse/grid/filters";

/** Entre dos revisiones automáticas pasa al menos este tiempo. */
export const SAVED_FILTERS_CHECK_INTERVAL_MS = 15 * 60 * 1000;
/** Pausa entre consultas de filtros distintos, para no parecer un bot. */
const BETWEEN_QUERIES_MS = 1_500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Cada cambio parte de las preferencias ya publicadas por el anterior.
let queue: Promise<unknown> = Promise.resolve();

function updateList(
	change: (list: readonly SavedFilter[]) => SavedFilter[],
): Promise<void> {
	const run = queue.then(() =>
		setPreferences({
			savedFilters: change(preferencesSnapshot().savedFilters),
		}),
	);
	queue = run.catch(() => undefined);
	return run;
}

class SavedFiltersState {
	/** Perfiles nuevos por filtro desde la última revisión (id de filtro → n). */
	newCounts = $state<Record<string, number>>({});
	checking = $state(false);
	#lastIds = new Map<string, number[]>();
	#lastCheckAt = 0;

	get items(): readonly SavedFilter[] {
		return preferencesSnapshot().savedFilters;
	}

	get totalNew(): number {
		return Object.values(this.newCounts).reduce((sum, n) => sum + n, 0);
	}

	async save({
		name,
		filters,
	}: {
		name: string;
		filters: GridSearchFilters;
	}): Promise<{ ok: true } | { ok: false; problem: SaveFilterProblem }> {
		let problem: SaveFilterProblem | null = null;
		await updateList((list) => {
			const result = addSavedFilter({
				list,
				name,
				filters,
				id: crypto.randomUUID(),
			});
			if (result.ok) return result.list;
			problem = result.problem;
			return [...list];
		});
		return problem === null ? { ok: true } : { ok: false, problem };
	}

	async remove(id: string): Promise<void> {
		await updateList((list) => list.filter((item) => item.id !== id));
		this.#lastIds.delete(id);
		delete this.newCounts[id];
	}

	/** Al abrir un filtro, lo que ya salió en la última revisión deja de ser nuevo. */
	async markViewed(id: string): Promise<void> {
		const ids = this.#lastIds.get(id) ?? [];
		this.newCounts[id] = 0;
		if (
			ids.length === 0 &&
			this.items.find((x) => x.id === id)?.baselineSet
		) {
			return;
		}
		await updateList((list) =>
			list.map((item) => (item.id === id ? markSeen(item, ids) : item)),
		);
	}

	/**
	 * Consulta la primera página de cada filtro guardado y cuenta lo nuevo.
	 * Solo se llama con la app abierta; sin `force` respeta el intervalo mínimo.
	 */
	async check({
		geohash,
		force = false,
		now = Date.now(),
	}: {
		geohash: string;
		force?: boolean;
		now?: number;
	}): Promise<void> {
		if (this.checking || this.items.length === 0) return;
		if (
			!force &&
			now - this.#lastCheckAt < SAVED_FILTERS_CHECK_INTERVAL_MS
		) {
			return;
		}
		this.checking = true;
		this.#lastCheckAt = now;
		try {
			let first = true;
			for (const saved of [...this.items]) {
				if (!first) await wait(BETWEEN_QUERIES_MS);
				first = false;
				await this.#checkOne({ saved, geohash });
			}
		} finally {
			this.checking = false;
		}
	}

	async #checkOne({
		saved,
		geohash,
	}: {
		saved: SavedFilter;
		geohash: string;
	}): Promise<void> {
		try {
			const { items } = await getGrid(
				buildCascadeQuery({ geohash, filters: saved.filters }),
			);
			const ids = items.map((item) => item.id);
			this.#lastIds.set(saved.id, ids);
			if (!saved.baselineSet) {
				// Primera vez: lo que hay ahora es el punto de partida, no "nuevo".
				this.newCounts[saved.id] = 0;
				await updateList((list) =>
					list.map((item) =>
						item.id === saved.id ? markSeen(item, ids) : item,
					),
				);
				return;
			}
			this.newCounts[saved.id] = newIdsFor(saved, ids).length;
		} catch (error) {
			// Sin aviso: es una comprobación en segundo plano y se reintentará.
			console.error("[saved-filters] check failed", error);
		}
	}

	reset(): void {
		this.newCounts = {};
		this.#lastIds.clear();
		this.#lastCheckAt = 0;
		this.checking = false;
	}
}

export const savedFilters = new SavedFiltersState();

registerAccountCache({ reset: () => savedFilters.reset() });
