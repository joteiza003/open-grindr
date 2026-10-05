import {
	control,
	map as createMap,
	marker as createMarker,
	divIcon,
	DomEvent,
	latLngBounds,
	type LeafletEvent,
	type Map as LeafletMap,
	type Marker as LeafletMarker,
	point,
} from "leaflet";

import { openExternalLink } from "$lib/platform/link-opener";
import { profileMediaUrl } from "$lib/util/media";
import type { MapMarker } from "$lib/model/map-elements";
import { type BaseLayerKind, DEFAULT_BASE_LAYER } from "./base-layers";
import {
	clusterMarkers,
	type MarkerCluster,
	NO_CLUSTER_ZOOM,
} from "./cluster-markers";
import { MapBaseLayer } from "./map-base-layer";
import { trace } from "./map-trace";
import {
	clusterContent,
	isProfileMarker,
	mePinContent,
	type PinContent,
	pinInitial,
	pinLabel,
	placePinContent,
	profilePinContent,
	sharedPinContent,
} from "./pin-content";
import { PinPhoto } from "./pin-photo";

/** Extra margin around the screen where pin photos are already loaded. */
const PHOTO_MARGIN = 0.4;
const CLUSTER_ZOOM_PADDING = 80;

/** Stacking order of what is drawn on the map (added to the vertical position). */
const LAYER = {
	me: -1000,
	shared: 0,
	pin: 500,
	cluster: 650,
	selected: 900,
} as const;

export type SharedPin = {
	id: string;
	latitude: number;
	longitude: number;
	title: string;
};

export type MePoint = { latitude: number; longitude: number };

export type MapSelection =
	| { kind: "pin" | "shared"; id: string }
	| { kind: "me" }
	| null;

export type MapViewHandlers = {
	onPinTap(id: string): void;
	onSharedTap(id: string): void;
	onMeTap(): void;
	onClusterTap(markers: MapMarker[]): void;
	onMapTap(): void;
	/** False when the map tiles keep failing to load, true when they recover. */
	onTilesChange?(working: boolean): void;
};

export type MapViewLabels = { cluster(count: number): string; me(): string };

export type MapViewOptions = { baseLayer?: BaseLayerKind };

type PinEntry = {
	model: MapMarker;
	marker: LeafletMarker;
	content: PinContent;
	photo: PinPhoto | null;
	onMap: boolean;
	selected: boolean;
	/** Drawn with the green outline of a profile that is online. */
	online: boolean;
};

type SpotEntry<T> = {
	model: T;
	marker: LeafletMarker;
	content: PinContent;
	selected: boolean;
};

function animationsAllowed(): boolean {
	return !(
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/**
 * The map, driven by plain method calls.
 *
 * Leaflet is used directly instead of through a reactive wrapper: every pin is
 * created once and kept, selection only toggles a class, clustering only adds
 * and removes the markers whose state changed, and no call can loop back into
 * Svelte. The screen tells the view what exists (`setPins`, `setShared`,
 * `setMe`, `setSelection`) and the view reports taps through `handlers`.
 */
export class MapView {
	readonly #map: LeafletMap;
	readonly #handlers: MapViewHandlers;
	readonly #labels: MapViewLabels;
	readonly #container: HTMLElement;

	#pins = new Map<string, PinEntry>();
	#online: ReadonlySet<number> = new Set();
	#clusters = new Map<string, LeafletMarker>();
	#shared = new Map<string, SpotEntry<SharedPin>>();
	#me: SpotEntry<MePoint> | null = null;
	#selection: MapSelection = null;
	#resizeObserver: ResizeObserver | undefined;
	#frame = 0;
	#destroyed = false;
	readonly #baseLayer: MapBaseLayer;

	constructor(
		container: HTMLElement,
		handlers: MapViewHandlers,
		labels: MapViewLabels,
		{ baseLayer = DEFAULT_BASE_LAYER }: MapViewOptions = {},
	) {
		this.#container = container;
		this.#handlers = handlers;
		this.#labels = labels;

		const map = createMap(container, {
			center: [25, 0],
			zoom: 2,
			attributionControl: false,
		});
		this.#map = map;

		control.attribution({ prefix: false }).addTo(map);
		this.#baseLayer = new MapBaseLayer(map, (working) =>
			this.#emit(() => handlers.onTilesChange?.(working)),
		);
		this.#baseLayer.show(baseLayer);
		control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

		map.on("click", () => this.#emit(() => handlers.onMapTap()));
		map.on("zoomend", () => this.#safely(() => this.#sync()));
		map.on("moveend", () => this.#safely(() => this.#loadVisiblePhotos()));

		container.addEventListener("click", this.#openLinksExternally);
		trace("map started");
		if (typeof ResizeObserver !== "undefined") {
			this.#resizeObserver = new ResizeObserver(() =>
				this.#scheduleResize(),
			);
			this.#resizeObserver.observe(container);
		}
	}

	get zoom(): number {
		return this.#map.getZoom();
	}

	/** Swaps what is drawn underneath the pins: the street map or satellite photos. */
	setBaseLayer(kind: BaseLayerKind): void {
		if (this.#destroyed || this.#baseLayer.kind === kind) return;
		this.#safely(() => this.#baseLayer.show(kind));
	}

	// --- what is drawn ------------------------------------------------------

	setPins(markers: MapMarker[]): void {
		if (this.#destroyed) return;
		const seen = new Set<string>();
		for (const model of markers) {
			seen.add(model.id);
			const entry = this.#pins.get(model.id);
			if (entry === undefined)
				this.#pins.set(model.id, this.#createPin(model));
			else this.#updatePin(entry, model);
		}
		for (const [id, entry] of this.#pins) {
			if (seen.has(id)) continue;
			this.#disposePin(entry);
			this.#pins.delete(id);
		}
		this.#safely(() => this.#sync());
	}

	/** Outlines in green the pins of the profiles that are online. */
	setOnline(profileIds: ReadonlySet<number>): void {
		if (this.#destroyed) return;
		this.#online = profileIds;
		for (const entry of this.#pins.values()) this.#applyOnline(entry);
	}

	setShared(items: SharedPin[]): void {
		if (this.#destroyed) return;
		const seen = new Set<string>();
		for (const model of items) {
			seen.add(model.id);
			const entry = this.#shared.get(model.id);
			if (entry === undefined) {
				this.#shared.set(model.id, this.#createShared(model));
				continue;
			}
			entry.model = model;
			entry.marker.setLatLng([model.latitude, model.longitude]);
			this.#retitle(entry.marker, model.title);
		}
		for (const [id, entry] of this.#shared) {
			if (seen.has(id)) continue;
			entry.marker.remove();
			this.#shared.delete(id);
		}
	}

	setMe(me: MePoint | null): void {
		if (this.#destroyed) return;
		if (me === null) {
			this.#me?.marker.remove();
			this.#me = null;
			return;
		}
		if (this.#me !== null) {
			this.#me.model = me;
			this.#me.marker.setLatLng([me.latitude, me.longitude]);
			return;
		}
		const content = mePinContent();
		const marker = this.#addMarker({
			latitude: me.latitude,
			longitude: me.longitude,
			content,
			title: this.#labels.me(),
			layer: LAYER.me,
			onTap: () => this.#handlers.onMeTap(),
		});
		this.#me = { model: me, marker, content, selected: false };
		this.#applySelection();
	}

	setSelection(selection: MapSelection): void {
		if (this.#destroyed) return;
		this.#selection = selection;
		this.#applySelection();
		// The selected pin is always drawn on its own, even inside a cluster.
		this.#safely(() => this.#sync());
	}

	// --- camera -------------------------------------------------------------

	setView(
		latitude: number,
		longitude: number,
		zoom: number,
		{ animate = true }: { animate?: boolean } = {},
	): void {
		this.#safely(() =>
			this.#map.setView([latitude, longitude], zoom, {
				animate: animate && animationsAllowed(),
			}),
		);
	}

	/** Centers on a point, zooming in to at least `minZoom`. */
	focus(latitude: number, longitude: number, minZoom: number): void {
		this.setView(latitude, longitude, Math.max(this.zoom, minZoom));
	}

	/** Frames every point; a lone point just gets centered. */
	fitPoints(points: [number, number][], maxZoom = 16): void {
		this.#safely(() => {
			if (points.length === 0) return;
			const animate = animationsAllowed();
			if (points.length === 1) {
				this.#map.setView(points[0]!, Math.max(this.zoom, 14), {
					animate,
				});
				return;
			}
			this.#map.fitBounds(points, {
				padding: [40, 40],
				maxZoom,
				animate,
			});
		});
	}

	/**
	 * Puts a point in the middle of the part of the map that a bottom panel of
	 * `bottomInset` pixels leaves uncovered, zooming in to at least `minZoom`.
	 */
	centerOn(
		latitude: number,
		longitude: number,
		{
			bottomInset = 0,
			minZoom = 0,
		}: { bottomInset?: number; minZoom?: number } = {},
	): void {
		this.#safely(() => {
			const zoom = Math.max(this.zoom, minZoom);
			// The map's own center sits half the panel below the middle of what
			// can be seen, so the point lands in the middle of that.
			const center = this.#map.unproject(
				this.#map
					.project([latitude, longitude], zoom)
					.add([0, bottomInset / 2]),
				zoom,
			);
			this.#map.setView(center, zoom, { animate: animationsAllowed() });
		});
	}

	/** Where a point is drawn, in pixels from the top left corner of the map. */
	containerPoint(
		latitude: number,
		longitude: number,
	): { x: number; y: number } {
		const { x, y } = this.#map.latLngToContainerPoint([
			latitude,
			longitude,
		]);
		return { x, y };
	}

	/** Pans just enough to keep a point clear of the panel covering the bottom. */
	reveal(latitude: number, longitude: number, bottomInset: number): void {
		this.#safely(() =>
			this.#map.panInside([latitude, longitude], {
				paddingTopLeft: [32, 32],
				paddingBottomRight: [32, bottomInset],
				animate: animationsAllowed(),
			}),
		);
	}

	/**
	 * Zooms in on a group of pins so they separate. Returns false when zooming
	 * cannot separate them, so the caller can list them instead.
	 */
	zoomToMarkers(markers: MapMarker[]): boolean {
		try {
			const bounds = latLngBounds(
				markers.map((m): [number, number] => [m.latitude, m.longitude]),
			);
			const padding = point(CLUSTER_ZOOM_PADDING, CLUSTER_ZOOM_PADDING);
			const fitted = this.#map.getBoundsZoom(bounds, false, padding);
			const target = Math.min(fitted, NO_CLUSTER_ZOOM);
			if (!Number.isFinite(target) || target <= this.zoom) return false;
			this.#map.fitBounds(bounds, {
				padding: [CLUSTER_ZOOM_PADDING, CLUSTER_ZOOM_PADDING],
				maxZoom: target,
				animate: animationsAllowed(),
			});
			return true;
		} catch (error) {
			console.error("[map] zoomToMarkers failed", error);
			return false;
		}
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;
		trace("map destroyed");
		cancelAnimationFrame(this.#frame);
		this.#baseLayer.dispose();
		this.#resizeObserver?.disconnect();
		this.#container.removeEventListener("click", this.#openLinksExternally);
		for (const entry of this.#pins.values()) entry.photo?.cancel();
		this.#pins.clear();
		this.#clusters.clear();
		this.#shared.clear();
		this.#me = null;
		this.#safely(() => {
			this.#map.off();
			this.#map.remove();
		});
	}

	// --- pins ---------------------------------------------------------------

	#createPin(model: MapMarker): PinEntry {
		const content = isProfileMarker(model)
			? profilePinContent(model)
			: placePinContent();
		const marker = this.#addMarker({
			latitude: model.latitude,
			longitude: model.longitude,
			content,
			title: pinLabel(model),
			layer: LAYER.pin,
			onTap: () => this.#handlers.onPinTap(model.id),
			addToMap: false,
		});
		const photo =
			content.image !== null && model.mediaHash
				? new PinPhoto(
						content.image,
						profileMediaUrl({
							mediaHash: model.mediaHash,
							size: "thumb",
						}),
					)
				: null;
		const selected =
			this.#selection?.kind === "pin" && this.#selection.id === model.id;
		const entry: PinEntry = {
			model,
			marker,
			content,
			photo,
			onMap: false,
			selected: false,
			online: false,
		};
		this.#mark(entry, selected, LAYER.pin);
		this.#applyOnline(entry);
		return entry;
	}

	#applyOnline(entry: PinEntry): void {
		const { profileId } = entry.model;
		const online = profileId !== undefined && this.#online.has(profileId);
		if (online === entry.online) return;
		entry.online = online;
		entry.content.root.classList.toggle("is-online", online);
	}

	#updatePin(entry: PinEntry, model: MapMarker): void {
		const before = entry.model;
		const looksDifferent =
			isProfileMarker(before) !== isProfileMarker(model) ||
			before.mediaHash !== model.mediaHash ||
			pinInitial(before) !== pinInitial(model);
		if (looksDifferent) {
			this.#disposePin(entry);
			this.#pins.set(model.id, this.#createPin(model));
			return;
		}
		entry.model = model;
		if (
			before.latitude !== model.latitude ||
			before.longitude !== model.longitude
		) {
			entry.marker.setLatLng([model.latitude, model.longitude]);
			this.#dropClusterMarkers();
		}
		this.#retitle(entry.marker, pinLabel(model));
	}

	#disposePin(entry: PinEntry): void {
		entry.photo?.cancel();
		entry.marker.remove();
		entry.onMap = false;
		this.#dropClusterMarkers();
	}

	#createShared(model: SharedPin): SpotEntry<SharedPin> {
		const content = sharedPinContent();
		const marker = this.#addMarker({
			latitude: model.latitude,
			longitude: model.longitude,
			content,
			title: model.title,
			layer: LAYER.shared,
			onTap: () => this.#handlers.onSharedTap(model.id),
		});
		const entry = { model, marker, content, selected: false };
		this.#mark(
			entry,
			this.#selection?.kind === "shared" &&
				this.#selection.id === model.id,
			LAYER.shared,
		);
		return entry;
	}

	#addMarker({
		latitude,
		longitude,
		content,
		title,
		layer,
		onTap,
		addToMap = true,
	}: {
		latitude: number;
		longitude: number;
		content: PinContent;
		title: string;
		layer: number;
		onTap: () => void;
		addToMap?: boolean;
	}): LeafletMarker {
		const marker = createMarker([latitude, longitude], {
			icon: divIcon({
				html: content.root,
				className: "og-pin-icon",
				iconSize: content.iconSize,
				iconAnchor: content.iconAnchor,
			}),
			title,
			keyboard: true,
			zIndexOffset: layer,
		});
		marker.on("click", (event: LeafletEvent) => {
			DomEvent.stopPropagation(event);
			this.#emit(onTap);
		});
		if (addToMap) marker.addTo(this.#map);
		return marker;
	}

	#retitle(marker: LeafletMarker, title: string): void {
		if (marker.options.title === title) return;
		marker.options.title = title;
		const element = marker.getElement();
		if (element) element.title = title;
	}

	// --- selection ----------------------------------------------------------

	#applySelection(): void {
		const selection = this.#selection;
		for (const [id, entry] of this.#pins) {
			this.#mark(
				entry,
				selection?.kind === "pin" && selection.id === id,
				LAYER.pin,
			);
		}
		for (const [id, entry] of this.#shared) {
			this.#mark(
				entry,
				selection?.kind === "shared" && selection.id === id,
				LAYER.shared,
			);
		}
		if (this.#me) this.#mark(this.#me, selection?.kind === "me", LAYER.me);
	}

	#mark(
		entry: {
			content: PinContent;
			marker: LeafletMarker;
			selected: boolean;
		},
		selected: boolean,
		baseLayer: number,
	): void {
		if (entry.selected === selected) return;
		entry.selected = selected;
		entry.content.root.classList.toggle("is-selected", selected);
		entry.marker.setZIndexOffset(selected ? LAYER.selected : baseLayer);
	}

	// --- clustering ---------------------------------------------------------

	/** Decides which pins stand alone and which are replaced by a badge. */
	#sync(): void {
		if (this.#destroyed) return;
		const selectedId =
			this.#selection?.kind === "pin" ? this.#selection.id : null;
		const models: MapMarker[] = [];
		for (const entry of this.#pins.values()) {
			if (entry.model.id !== selectedId) models.push(entry.model);
		}

		const standing = new Set<string>();
		const groups = new Map<
			string,
			Extract<MarkerCluster, { type: "group" }>
		>();
		for (const item of clusterMarkers(models, this.#map.getZoom())) {
			if (item.type === "single") standing.add(item.marker.id);
			else groups.set(this.#clusterKey(item), item);
		}
		if (selectedId !== null) standing.add(selectedId);

		for (const [id, entry] of this.#pins) {
			this.#setPinOnMap(entry, standing.has(id));
		}
		this.#syncClusterMarkers(groups);
		this.#loadVisiblePhotos();
	}

	#clusterKey(group: Extract<MarkerCluster, { type: "group" }>): string {
		return `${group.id}@${group.latitude.toFixed(5)},${group.longitude.toFixed(5)}`;
	}

	#setPinOnMap(entry: PinEntry, wanted: boolean): void {
		if (wanted === entry.onMap) return;
		if (wanted) entry.marker.addTo(this.#map);
		else entry.marker.remove();
		entry.onMap = wanted;
	}

	#syncClusterMarkers(
		groups: Map<string, Extract<MarkerCluster, { type: "group" }>>,
	): void {
		for (const [key, marker] of this.#clusters) {
			if (groups.has(key)) continue;
			marker.remove();
			this.#clusters.delete(key);
		}
		for (const [key, group] of groups) {
			if (this.#clusters.has(key)) continue;
			this.#clusters.set(
				key,
				this.#addMarker({
					latitude: group.latitude,
					longitude: group.longitude,
					content: clusterContent(group.markers.length),
					title: this.#labels.cluster(group.markers.length),
					layer: LAYER.cluster,
					onTap: () => this.#handlers.onClusterTap(group.markers),
				}),
			);
		}
	}

	#dropClusterMarkers(): void {
		for (const marker of this.#clusters.values()) marker.remove();
		this.#clusters.clear();
	}

	// --- photos -------------------------------------------------------------

	/** Starts the photos of pins on screen, nearest to the center first. */
	#loadVisiblePhotos(): void {
		if (this.#destroyed) return;
		const size = this.#map.getSize();
		if (size.x === 0 || size.y === 0) return;
		const bounds = this.#map.getBounds().pad(PHOTO_MARGIN);
		const center = this.#map.getCenter();
		const due: { entry: PinEntry; distance: number }[] = [];
		for (const entry of this.#pins.values()) {
			if (entry.photo?.phase !== "idle" || !entry.onMap) continue;
			const { latitude, longitude } = entry.model;
			if (!bounds.contains([latitude, longitude])) continue;
			due.push({
				entry,
				distance: center.distanceTo([latitude, longitude]),
			});
		}
		due.sort((a, b) => a.distance - b.distance);
		for (const { entry } of due) entry.photo?.request();
	}

	// --- housekeeping -------------------------------------------------------

	#scheduleResize(): void {
		if (this.#destroyed || this.#frame !== 0) return;
		this.#frame = requestAnimationFrame(() => {
			this.#frame = 0;
			this.#safely(() => {
				this.#map.invalidateSize({ animate: false, pan: false });
				this.#loadVisiblePhotos();
			});
		});
	}

	/**
	 * The WebView would otherwise open the attribution link inside the app.
	 * Leaflet's own buttons are links to "#"; they stop their clicks before
	 * they get here and are not web addresses anyway.
	 */
	readonly #openLinksExternally = (event: MouseEvent): void => {
		if (!(event.target instanceof Element)) return;
		const href = event.target.closest("a[href]")?.getAttribute("href");
		if (!href || !/^https?:\/\//i.test(href)) return;
		event.preventDefault();
		this.#safely(() => openExternalLink(href));
	};

	/** Runs a handler of the screen; a throwing handler must not break the map. */
	#emit(callback: () => void): void {
		this.#safely(callback);
	}

	#safely(callback: () => void): void {
		try {
			callback();
		} catch (error) {
			console.error("[map] view error", error);
		}
	}
}
