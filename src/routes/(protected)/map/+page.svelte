<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import {
		DomEvent,
		type Map as LeafletMap,
		type LeafletMouseEvent,
	} from "leaflet";
	import {
		ArrowsOutIcon,
		CaretLeftIcon,
		CircleIcon,
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
	import MapCircleLayer from "$lib/components/map-elements/MapCircleLayer.svelte";
	import MapHud from "$lib/components/map-elements/MapHud.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import { currentLocale } from "$lib/i18n/t";
	import {
		clusterMarkers,
		type MarkerCluster,
	} from "$lib/map/cluster-markers";
	import { circleBounds, radiusPixels } from "$lib/map/geographic";
	import { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import {
		clusterIcon,
		placePinIcon,
		selectedPlacePinIcon,
		sharedPinIcon,
		userPinIcon,
	} from "$lib/map/map-icons";
	import { decodeGeohash } from "$lib/model/geohash";
	import type { MapCircle, MapMarker } from "$lib/model/map-elements";
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

	const picking = $derived(
		overlays.mode === "ADD_CIRCLE" || overlays.mode === "ADD_MARKER",
	);

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
	const locale = $derived(currentLocale());
	const userLocation = $derived(
		customLocation
			? { latitude: customLocation.lat, longitude: customLocation.lon }
			: null,
	);

	/** Frame a circle in the space left free by the bottom editor. */
	function focusCircle(circle: MapCircle) {
		if (!map) return;
		const bounds = circleBounds(circle);
		const pixels = radiusPixels(circle.radiusKm, circle.latitude, zoom);
		if (map.getBounds().contains(bounds) && pixels >= 40) return;
		map.fitBounds(bounds, {
			paddingTopLeft: [40, 40],
			paddingBottomRight: [40, 300],
			maxZoom: 16,
		});
	}

	function fitAll() {
		if (!map) return;
		const points: [number, number][] = [];
		for (const circle of overlays.circles) {
			const [[south, west], [north, east]] = circleBounds(circle);
			points.push([south, west], [north, east]);
		}
		for (const marker of overlays.markers) {
			points.push([marker.latitude, marker.longitude]);
		}
		for (const location of library.locations) {
			points.push([location.lat, location.lon]);
		}
		if (customLocation) {
			points.push([customLocation.lat, customLocation.lon]);
		}
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

	// Bring a newly selected circle into view (not while dragging its handles).
	let lastFocusedCircleId: string | null = null;
	$effect(() => {
		const id = overlays.selectedCircleId;
		if (id === lastFocusedCircleId) return;
		lastFocusedCircleId = id;
		const circle = id
			? overlays.circles.find((item) => item.id === id)
			: null;
		if (circle) focusCircle(circle);
	});

	function pickListedCircle(circle: MapCircle) {
		listOpen = false;
		overlays.selectCircle(circle.id);
	}

	function labelFor(location: SavedLocation): string {
		return (
			location.displayName ??
			(location.senderId !== null
				? `#${location.senderId}`
				: t("chat.sharedLocation"))
		);
	}

	function when(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	const selectedCircle = $derived(
		overlays.circles.find(
			(circle) => circle.id === overlays.selectedCircleId,
		) ?? null,
	);
	const selectedMarker = $derived(
		overlays.markers.find(
			(marker) => marker.id === overlays.selectedMarkerId,
		) ?? null,
	);

	const empty =
		!library.loading &&
		!overlays.loading &&
		library.locations.length === 0 &&
		overlays.circles.length === 0 &&
		overlays.markers.length === 0 &&
		overlays.mode === "NORMAL";

	const modeHint =
		overlays.mode === "ADD_CIRCLE"
			? t("map.tapCircle")
			: overlays.mode === "ADD_MARKER"
				? t("map.tapMarker")
				: null;

	async function confirmDelete(): Promise<void> {
		if (overlays.circleDraft?.id) {
			await overlays.deleteCircle(overlays.circleDraft.id);
		} else if (selectedCircle) {
			await overlays.deleteCircle(selectedCircle.id);
		} else if (selectedMarker) {
			await overlays.deleteMarker(selectedMarker.id);
		}
		confirmOpen = false;
	}

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
</script>

<main
	class="relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<header class="flex items-center gap-2 px-4 pt-3 pb-2">
		<a
			href="/settings"
			class="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors can-hover:hover:bg-muted"
			aria-label={t("common.back")}
		>
			<CaretLeftIcon class="size-5" />
		</a>
		<h1 class="min-w-0 flex-1 text-xl font-semibold tracking-tight">
			{t("map.title")}
		</h1>
		<Button
			variant={listOpen ? "default" : "secondary"}
			size="icon"
			aria-label={t("map.list")}
			title={t("map.list")}
			onclick={() => (listOpen = !listOpen)}
		>
			<ListIcon class="size-5" />
		</Button>
		<Button
			variant={overlays.mode === "ADD_CIRCLE" ||
			overlays.mode === "CIRCLE_CONFIGURATION"
				? "default"
				: "secondary"}
			size="icon"
			aria-label={t("map.addCircle")}
			title={t("map.addCircle")}
			onclick={() => overlays.beginAddCircle()}
		>
			<CircleIcon class="size-5" />
		</Button>
		<Button
			variant={overlays.mode === "ADD_MARKER" ||
			overlays.mode === "MARKER_CONFIGURATION"
				? "default"
				: "secondary"}
			size="icon"
			aria-label={t("map.addMarker")}
			title={t("map.addMarker")}
			onclick={() => overlays.beginAddMarker()}
		>
			<MapPinPlusIcon class="size-5" />
		</Button>
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

				<MapCircleLayer {overlays} {zoom} {picking} {locale} />

				{#each markerClusters as cluster (cluster.type === "single" ? cluster.marker.id : cluster.id)}
					{#if cluster.type === "single"}
						{@const marker = cluster.marker}
						<Marker
							latLng={[marker.latitude, marker.longitude]}
							options={{
								icon:
									marker.id === overlays.selectedMarkerId
										? selectedPlacePinIcon
										: placePinIcon,
								title: marker.title,
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
									<strong>{marker.title}</strong>
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
							title: labelFor(location),
							zIndexOffset: 400,
						}}
					>
						<Popup>
							<strong>{labelFor(location)}</strong><br />
							{when(location.receivedAt)}
						</Popup>
					</Marker>
				{/each}
			</Map>
		</div>

		<div
			class="pointer-events-none absolute end-3 top-3 z-1000 flex flex-col gap-2"
		>
			<Button
				variant="secondary"
				size="icon"
				class="pointer-events-auto shadow-lg"
				aria-label={t("map.fitAll")}
				title={t("map.fitAll")}
				onclick={fitAll}
			>
				<ArrowsOutIcon class="size-5" />
			</Button>
			<Button
				variant="secondary"
				size="icon"
				class="pointer-events-auto shadow-lg"
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
			{userLocation}
			onPickCircle={pickListedCircle}
			{modeHint}
			{empty}
			bind:openCluster
			bind:confirmOpen
			{selectedMarker}
			onPickMarker={pickClusteredMarker}
			onConfirmDelete={confirmDelete}
		/>
	</div>
</main>

<style>
	:global(.leaflet-tooltip.map-circle-label) {
		background: rgb(0 0 0 / 65%);
		border: 0;
		border-radius: 999px;
		box-shadow: none;
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		padding: 2px 8px;
		pointer-events: none;
	}
	:global(.leaflet-tooltip.map-circle-label::before) {
		display: none;
	}
</style>
