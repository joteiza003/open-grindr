import { type Map as LeafletMap, type TileLayer, tileLayer } from "leaflet";

import { BASE_LAYERS, type BaseLayerKind } from "./base-layers";
import { trace } from "./map-trace";

/** Failed tiles in a row before the map is reported as not loading. */
const TILE_FAILURES_BEFORE_NOTICE = 4;
/** The old layer stays under the new one this long at most, so a switch never flashes empty. */
const SWAP_MS = 2_500;

/**
 * The tiles drawn underneath the pins: the street map or satellite photos.
 *
 * Switching draws the new layer above the old one and drops the old one once
 * the new one has loaded (or after a moment), so the map is never empty in
 * between. It also says when the tiles keep failing and when they come back;
 * only the layer on show counts, one on its way out may still fail.
 *
 * The attribution control of the map has to exist before the first layer is
 * shown: it only forgets the text of a layer it saw being added.
 */
export class MapBaseLayer {
	readonly #map: LeafletMap;
	readonly #onTilesChange: (working: boolean) => void;

	#current: { kind: BaseLayerKind; tiles: TileLayer } | null = null;
	/** Counts the layers drawn so far: each one goes above the last. */
	#count = 0;
	/** Layers on their way out, until the newest one has loaded. */
	#retiring = new Set<TileLayer>();
	#stopWaiting: (() => void) | null = null;
	#failures = 0;
	#working = true;

	constructor(map: LeafletMap, onTilesChange: (working: boolean) => void) {
		this.#map = map;
		this.#onTilesChange = onTilesChange;
	}

	get kind(): BaseLayerKind | null {
		return this.#current?.kind ?? null;
	}

	show(kind: BaseLayerKind): void {
		const previous = this.#current;
		const { url, ...options } = BASE_LAYERS[kind];
		this.#count += 1;
		const tiles = tileLayer(url, { ...options, zIndex: this.#count });
		this.#current = { kind, tiles };
		trace(`base layer: ${kind}`);
		this.#watch(tiles);
		tiles.addTo(this.#map);

		// What failed to load on the old layer says nothing about the new one.
		this.#failures = 0;
		if (!this.#working) {
			this.#working = true;
			this.#onTilesChange(true);
		}
		if (previous !== null) {
			this.#retiring.add(previous.tiles);
			this.#dropRetiredWhenLoaded(tiles);
		}
	}

	/** Stops waiting on a switch in progress; the map itself removes the layers. */
	dispose(): void {
		this.#stopWaiting?.();
	}

	/** Everything on its way out goes once `newest` has loaded, or after a moment. */
	#dropRetiredWhenLoaded(newest: TileLayer): void {
		this.#stopWaiting?.();
		const drop = () => {
			this.#stopWaiting?.();
			for (const old of this.#retiring) old.remove();
			this.#retiring.clear();
		};
		const timer = setTimeout(drop, SWAP_MS);
		newest.once("load", drop);
		this.#stopWaiting = () => {
			clearTimeout(timer);
			newest.off("load", drop);
			this.#stopWaiting = null;
		};
	}

	#watch(tiles: TileLayer): void {
		tiles.on("tileload", () => {
			if (this.#current?.tiles !== tiles) return;
			this.#failures = 0;
			if (this.#working) return;
			this.#working = true;
			trace("map tiles are loading again");
			this.#onTilesChange(true);
		});
		tiles.on("tileerror", () => {
			if (this.#current?.tiles !== tiles) return;
			this.#failures += 1;
			if (
				this.#failures < TILE_FAILURES_BEFORE_NOTICE ||
				!this.#working
			) {
				return;
			}
			this.#working = false;
			trace("map tiles keep failing to load");
			this.#onTilesChange(false);
		});
	}
}
