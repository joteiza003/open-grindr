<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import { goto } from "$app/navigation";
	import {
		DomEvent,
		type Map as LeafletMap,
		type LeafletMouseEvent,
	} from "leaflet";
	import {
		ArrowsOutIcon,
		CaretLeftIcon,
		CrosshairIcon,
		ListIcon,
		MapPinPlusIcon,
	} from "phosphor-svelte";
	import {
		ControlAttribution,
		ControlScale,
		Map,
		Marker,
		Popup,
		TileLayer,
	} from "sveaflet";
	import { onMount } from "svelte";

	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { SavedLocationsState } from "$lib/chat/saved-locations-state.svelte";
	import MapHud from "$lib/components/map-elements/MapHud.svelte";
	import BackLink from "$lib/components/navigation/BackLink.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import {
		clusterMarkers,
		type MarkerCluster,
	} from "$lib/map/cluster-markers";
	import { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import {
		clusterIcon,
		placePinIcon,
		profilePinIcon,
		selectedPlacePinIcon,
		sharedPinIcon,
		userPinIcon,
	} from "$lib/map/map-icons";
	import {
		allMapPoints,
		directionsUrl,
		formatReceivedAt,
		locationLabel,
	} from "$lib/map/map-page-helpers";
	import { decodeGeohash } from "$lib/model/geohash";
	import { dismissOnBackGesture } from "$lib/platform/back-gesture-event.svelte";
	import { openExternalLink } from "$lib/platform/link-opener";
	import { profileMediaUrl } from "$lib/util/media";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	const library = new SavedLocationsState();
	const overlays = new MapElementsState();
	let map: LeafletMap | undefined = $state();
	let confirmOpen = $state(false);
	let zoom = $state(2);
	let listOpen = $state(false);
	let openCluster = $state<Extract<MarkerCluster, { type: "group" }> | null>(
		null,
	);

	onMount(() => {
		void library.load();
		void overlays.load();
	});

	const customLocation = $derived.by(() => {
		const geohash = preferencesSnapshot().geohash;
		if (!geohash) return null;
		try {
			return decodeGeohash(geohash);
		} catch {
			return null;
		}
	});

	let centered = $state(false);
	$effect(() => {
		if (!map) return;
		map.invalidateSize();
		if (centered) return;
		if (customLocation) {
			map.setView([customLocation.lat, customLocation.lon], 12);
			centered = true;
			return;
		}
		const first = library.locations[0];
		if (first === undefined) return;
		map.setView([first.lat, first.lon], 11);
		centered = true;
	});

	const picking = $derived(overlays.mode === "ADD_MARKER");

	$effect(() => {
		const instance = map;
		if (!instance) return;
		const onMapClick = (event: LeafletMouseEvent) => {
			openCluster = null;
			overlays.handleMapClick(event.latlng.lat, event.latlng.lng);
		};
		const onZoom = () => {
			zoom = instance.getZoom();
		};
		zoom = instance.getZoom();
		instance.on("click", onMapClick);
		instance.on("zoomend", onZoom);
		instance.getContainer().style.cursor = picking ? "crosshair" : "";
		return () => {
			instance.off("click", onMapClick);
			instance.off("zoomend", onZoom);
			instance.getContainer().style.cursor = "";
		};
	});

	const markerClusters = $derived(clusterMarkers(overlays.markers, zoom));
	function fitAll() {
		if (!map) return;
		const points = allMapPoints(
			overlays.markers,
			library.locations,
			customLocation,
		);
		if (points.length === 0) return;
		map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
	}

	function goToMyLocation() {
		if (!map || !customLocation) return;
		map.setView(
			[customLocation.lat, customLocation.lon],
			Math.max(zoom, 13),
		);
	}

	const selectedMarker = $derived(
		overlays.markers.find(
			(marker) => marker.id === overlays.selectedMarkerId,
		) ?? null,
	);

	const empty = $derived(
		!library.loading &&
			!overlays.loading &&
			library.locations.length === 0 &&
			overlays.markers.length === 0 &&
			overlays.mode === "NORMAL",
	);

	const modeHint = $derived(
		overlays.mode === "ADD_MARKER" ? t("map.tapMarker") : null,
	);

	type PendingDelete =
		| { kind: "location"; id: string }
		| { kind: "marker"; id: string }
		| { kind: "all-locations" }
		| { kind: "all-markers" };

	// Qué se va a borrar al confirmar; sin nada, es el marcador seleccionado.
	let pending = $state<PendingDelete | null>(null);

	function requestDelete(next: PendingDelete) {
		pending = next;
		confirmOpen = true;
	}

	function requestDeleteLocation(location: SavedLocation) {
		requestDelete({ kind: "location", id: location.localId });
	}

	const confirmTexts = $derived.by(() => {
		if (pending?.kind === "all-locations") {
			return {
				title: t("map.deleteAllTitle"),
				body: t("map.deleteAllLocationsBody", {
					n: library.locations.length,
				}),
			};
		}
		if (pending?.kind === "all-markers") {
			return {
				title: t("map.deleteAllTitle"),
				body: t("map.deleteAllMarkersBody", {
					n: overlays.markers.length,
				}),
			};
		}
		return { title: t("map.deleteTitle"), body: t("map.deleteBody") };
	});

	function pickListedLocation(location: SavedLocation) {
		listOpen = false;
		map?.setView([location.lat, location.lon], Math.max(zoom, 14));
	}

	async function confirmDelete(): Promise<void> {
		const target = pending;
		try {
			if (target?.kind === "location") {
				await library.remove(target.id);
			} else if (target?.kind === "marker") {
				await overlays.deleteMarker(target.id);
			} else if (target?.kind === "all-locations") {
				await library.removeAll();
			} else if (target?.kind === "all-markers") {
				await overlays.deleteAllMarkers();
			} else if (selectedMarker) {
				await overlays.deleteMarker(selectedMarker.id);
			}
		} catch (error) {
			console.error("[map] Failed to delete", error);
			overlays.error = String(error);
		} finally {
			confirmOpen = false;
		}
	}

	$effect(() => {
		if (!confirmOpen) pending = null;
		if (overlays.mode !== "NORMAL") listOpen = false;
	});

	// System back closes the innermost open panel before leaving the map.
	dismissOnBackGesture({
		active: () =>
			confirmOpen ||
			openCluster !== null ||
			listOpen ||
			overlays.mode !== "NORMAL",
		dismiss: () => {
			if (confirmOpen) confirmOpen = false;
			else if (openCluster) openCluster = null;
			else if (overlays.mode === "NORMAL") listOpen = false;
			else overlays.cancelCreation();
		},
	});

	function onClusterClick(
		cluster: Extract<MarkerCluster, { type: "group" }>,
	) {
		if (!map) return;
		if (zoom >= 15) {
			openCluster = cluster;
			return;
		}
		openCluster = null;
		map.setView(
			[cluster.latitude, cluster.longitude],
			Math.min(zoom + 2, 17),
		);
	}

	function pickClusteredMarker(marker: MapMarker) {
		openCluster = null;
		listOpen = false;
		overlays.selectMarker(marker.id);
		map?.setView([marker.latitude, marker.longitude], Math.max(zoom, 16));
	}

	const markerActive = $derived(
		overlays.mode === "ADD_MARKER" ||
			overlays.mode === "MARKER_CONFIGURATION",
	);

	function toggleAdd(active: boolean, begin: () => void) {
		listOpen = false;
		openCluster = null;
		if (active) overlays.cancelCreation();
		else begin();
	}
</script>

<main
	class="relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<!-- Glass header -->
	<header
		class="relative z-20 flex items-center gap-1.5 border-b border-border/40 bg-background/95 px-3 py-2.5"
	>
		<BackLink
			href="/"
			label={t("common.back")}
			class="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors active:bg-muted can-hover:hover:bg-muted"
		>
			<CaretLeftIcon class="size-5" weight="bold" />
		</BackLink>

		<h1
			class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight"
		>
			{t("map.title")}
		</h1>

		<div class="flex items-center gap-1">
			<Button
				variant={listOpen ? "default" : "ghost"}
				size="icon"
				class="size-10 rounded-full text-foreground"
				aria-label={t("map.list")}
				title={t("map.list")}
				aria-pressed={listOpen}
				onclick={() => {
					openCluster = null;
					if (overlays.mode !== "NORMAL") overlays.cancelCreation();
					listOpen = !listOpen;
				}}
			>
				<ListIcon
					class="size-5"
					weight={listOpen ? "fill" : "regular"}
				/>
			</Button>

			<Button
				variant={markerActive ? "default" : "ghost"}
				size="icon"
				class="size-10 rounded-full text-foreground"
				aria-label={t("map.addMarker")}
				title={t("map.addMarker")}
				aria-pressed={markerActive}
				onclick={() =>
					toggleAdd(markerActive, () => overlays.beginAddMarker())}
			>
				<MapPinPlusIcon
					class="size-5"
					weight={markerActive ? "fill" : "regular"}
				/>
			</Button>
		</div>
	</header>

	<div class="relative min-h-0 flex-1">
		<div class="h-full w-full">
			<Map
				options={{
					center: [25, 0],
					zoom: 2,
					attributionControl: false,
				}}
				bind:instance={map}
			>
				<TileLayer
					url={"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
					options={{
						maxZoom: 19,
						attribution:
							'&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer nofollow noopener">OpenStreetMap</a> &nbsp;',
					}}
				/>
				<ControlAttribution options={{ prefix: undefined }} />
				<ControlScale
					options={{ imperial: false, position: "bottomleft" }}
				/>

				{#each markerClusters as cluster (cluster.type === "single" ? cluster.marker.id : cluster.id)}
					{#if cluster.type === "single"}
						{@const marker = cluster.marker}
						<Marker
							latLng={[marker.latitude, marker.longitude]}
							options={{
								icon: marker.mediaHash
									? profilePinIcon(
											profileMediaUrl({
												mediaHash: marker.mediaHash,
												size: "thumb",
											}),
											marker.id ===
												overlays.selectedMarkerId,
										)
									: marker.id === overlays.selectedMarkerId
										? selectedPlacePinIcon
										: placePinIcon,
								title: marker.displayName ?? marker.title,
								zIndexOffset:
									marker.id === overlays.selectedMarkerId
										? 700
										: 500,
							}}
							onclick={(event: LeafletMouseEvent) => {
								DomEvent.stopPropagation(event);
								if (picking) {
									overlays.handleMapClick(
										event.latlng.lat,
										event.latlng.lng,
									);
									return;
								}
								overlays.selectMarker(marker.id);
							}}
						>
							{#if marker.id === overlays.selectedMarkerId}
								<Popup>
									<strong
										>{marker.displayName ??
											marker.title}</strong
									>
								</Popup>
							{/if}
						</Marker>
					{:else}
						<Marker
							latLng={[cluster.latitude, cluster.longitude]}
							options={{
								icon: clusterIcon(cluster.markers.length),
								title: t("map.markerCount", {
									count: cluster.markers.length,
								}),
								zIndexOffset: 650,
							}}
							onclick={(event: LeafletMouseEvent) => {
								DomEvent.stopPropagation(event);
								if (picking) {
									overlays.handleMapClick(
										event.latlng.lat,
										event.latlng.lng,
									);
									return;
								}
								onClusterClick(cluster);
							}}
						/>
					{/if}
				{/each}

				{#if overlays.markerDraft}
					<Marker
						latLng={[
							overlays.markerDraft.latitude,
							overlays.markerDraft.longitude,
						]}
						options={{
							icon: placePinIcon,
							zIndexOffset: 800,
							title:
								overlays.markerDraft.title ||
								t("map.newMarker"),
						}}
					/>
				{/if}

				{#if customLocation}
					<Marker
						latLng={[customLocation.lat, customLocation.lon]}
						options={{
							icon: userPinIcon,
							title: t("map.yourLocation"),
							zIndexOffset: 1000,
						}}
					>
						<Popup>
							<strong>{t("map.yourLocation")}</strong><br />
							{t("map.customPosition")}
						</Popup>
					</Marker>
				{/if}

				{#each library.locations as location (location.localId)}
					<Marker
						latLng={[location.lat, location.lon]}
						options={{
							icon: sharedPinIcon,
							title: locationLabel(location),
							zIndexOffset: 400,
						}}
					>
						<Popup>
							<strong>{locationLabel(location)}</strong><br />
							{formatReceivedAt(location.receivedAt)}
						</Popup>
					</Marker>
				{/each}
			</Map>
		</div>

		<!-- Floating map controls -->
		<div
			class="pointer-events-none absolute end-3 top-3 z-1000 flex flex-col gap-2"
		>
			<Button
				variant="secondary"
				size="icon"
				class="pointer-events-auto size-11 rounded-2xl border border-border/60 bg-card/95 shadow-lg can-hover:hover:bg-card"
				aria-label={t("map.fitAll")}
				title={t("map.fitAll")}
				onclick={fitAll}
			>
				<ArrowsOutIcon class="size-5" />
			</Button>
			<Button
				variant="secondary"
				size="icon"
				class="pointer-events-auto size-11 rounded-2xl border border-border/60 bg-card/95 shadow-lg disabled:opacity-40 can-hover:hover:bg-card"
				aria-label={t("map.locate")}
				title={customLocation ? t("map.locate") : t("map.noLocation")}
				disabled={!customLocation}
				onclick={goToMyLocation}
			>
				<CrosshairIcon class="size-5" />
			</Button>
		</div>

		<MapHud
			{overlays}
			bind:listOpen
			locations={library.locations}
			{locationLabel}
			onPickLocation={pickListedLocation}
			onDeleteLocation={requestDeleteLocation}
			onDeleteMarker={(marker) =>
				requestDelete({ kind: "marker", id: marker.id })}
			onDeleteAll={(kind) =>
				requestDelete({
					kind: kind === "markers" ? "all-markers" : "all-locations",
				})}
			confirmTitle={confirmTexts.title}
			confirmBody={confirmTexts.body}
			{modeHint}
			{empty}
			bind:openCluster
			bind:confirmOpen
			{selectedMarker}
			onPickMarker={pickClusteredMarker}
			onConfirmDelete={confirmDelete}
			onOpenProfile={(id) => void goto(`/profile/${id}`)}
			onOpenDirections={(marker) =>
				openExternalLink(directionsUrl(marker, customLocation))}
		/>
	</div>
</main>

<style>
	/* Soften leaflet attribution on dark/light */
	:global(.leaflet-control-attribution) {
		background: rgb(255 255 255 / 75%) !important;
		border-radius: 8px 0 0 0;
		font-size: 10px !important;
		padding: 2px 6px !important;
	}
</style>
