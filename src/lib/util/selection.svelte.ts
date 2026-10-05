import { SvelteSet } from "svelte/reactivity";

export class SelectionSet<T> {
	readonly max: number | null;
	#selected = new SvelteSet<T>();

	constructor(max: number | null = null) {
		this.max = max;
	}

	get size(): number {
		return this.#selected.size;
	}

	get canSelectMore(): boolean {
		return this.max === null || this.#selected.size < this.max;
	}

	has(item: T): boolean {
		return this.#selected.has(item);
	}

	add(item: T): void {
		if (this.#selected.has(item) || !this.canSelectMore) return;
		this.#selected.add(item);
	}

	delete(item: T): void {
		this.#selected.delete(item);
	}

	toggle(item: T): void {
		if (this.#selected.has(item)) {
			this.#selected.delete(item);
		} else {
			this.add(item);
		}
	}

	/** Posición (desde 1) en el orden en que se eligió, o `null` si no está elegido. */
	orderOf(item: T): number | null {
		let position = 1;
		for (const selected of this.#selected) {
			if (selected === item) return position;
			position++;
		}
		return null;
	}

	values(): T[] {
		return [...this.#selected];
	}

	clear(): void {
		this.#selected.clear();
	}
}
