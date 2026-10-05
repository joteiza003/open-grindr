import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import {
	countActiveFilters,
	defaultFilters,
	type GridSearchFilters,
} from "$lib/model/browse/grid/filters";
import { deepEqual } from "$lib/util/deep-equal";
import { type CompiledFilters, compileFilters } from "./pin-filters";

/** Edits come in bursts (a slider being dragged); they are written once they stop. */
const SAVE_DELAY_MS = 500;

/**
 * The filters applied to the map: the same ones as on the browse screen, kept
 * apart from them so that narrowing the map never changes what the grid shows.
 *
 * `value` is what the filter fields edit, and every change shows on the map at
 * once. Saving follows the editing and never holds it up.
 */
export class MapFiltersState {
	value = $state<GridSearchFilters>(structuredClone(defaultFilters));
	/** The filters in a form that can be asked about a profile. */
	compiled: CompiledFilters = $derived.by(() => compileFilters(this.value));
	/** How many filters are switched on, as the filter sheets count them. */
	count = $derived.by(() => countActiveFilters(this.value));
	/** Called when the filters could not be saved. They stay as they are. */
	onSaveError: ((error: unknown) => void) | undefined;

	readonly #save: (filters: GridSearchFilters) => Promise<void>;
	#saved: GridSearchFilters;
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor({
		initial = preferencesSnapshot().mapFilters,
		save = (filters: GridSearchFilters) =>
			setPreferences({ mapFilters: filters }),
	}: {
		initial?: GridSearchFilters;
		save?: (filters: GridSearchFilters) => Promise<void>;
	} = {}) {
		this.#save = save;
		// Snapshots, not structured clones: what the preferences hand over and
		// what `value` holds are reactive proxies, which cannot be cloned.
		this.value = $state.snapshot(initial ?? defaultFilters);
		this.#saved = $state.snapshot(this.value);
	}

	/** Switches every filter off. */
	clear(): void {
		this.value = structuredClone(defaultFilters);
		this.saveSoon();
	}

	/** Writes the filters shortly, once edits stop; nothing is written if nothing changed. */
	saveSoon(): void {
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.saveNow(), SAVE_DELAY_MS);
	}

	async saveNow(): Promise<void> {
		clearTimeout(this.#timer);
		const filters = $state.snapshot(this.value);
		if (deepEqual(filters, this.#saved)) return;
		this.#saved = structuredClone(filters);
		try {
			await this.#save(filters);
		} catch (error) {
			console.error("[map] could not save the filters", error);
			this.onSaveError?.(error);
		}
	}

	/** Stops waiting to save, and writes right away what was left. */
	flush(): Promise<void> {
		return this.saveNow();
	}
}
