<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import {
		divIcon,
		DomEvent,
		type Map as LeafletMap,
		type LeafletMouseEvent,
	} from "leaflet";
	import { CaretLeftIcon, CircleIcon, MapPinPlusIcon } from "phosphor-svelte";
	import {
		Circle,
		ControlAttribution,
		Map,
		Marker,
		Popup,
		TileLayer,
	} from "sveaflet";
	import { onMount } from "svelte";

	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { SavedLocationsState } from "$lib/chat/saved-locations-state.svelte";
	import MapHud from "$lib/components/map-elements/MapHud.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import {
		clusterMarkers,
		type MarkerCluster,
	} from "$lib/map/cluster-markers";
	import {
		CIRCLE_FILL_OPACITY,
		CIRCLE_SELECTED_WEIGHT,
		CIRCLE_STROKE_OPACITY,
		CIRCLE_WEIGHT,
		convertKmToMeters,
	} from "$lib/map/geographic";
	import { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import { decodeGeohash } from "$lib/model/geohash";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	const library = new SavedLocationsState();
	const overlays = new MapElementsState();
	let map: LeafletMap | undefined = $state();
	let confirmOpen = $state(false);
	let zoom = $state(2);
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

	$effect(() => {
		const first = library.locations[0];
		if (!map || first === undefined) return;
		map.setView([first.lat, first.lon], 11);
	});

	const picking =
		overlays.mode === "ADD_CIRCLE" || overlays.mode === "ADD_MARKER";

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

	const sharedPinIcon = divIcon({
		html: pinSvg("#ffba20", 36),
		iconAnchor: [18, 36],
		iconSize: [36, 36],
		className: "",
	});

	const userPinIcon = divIcon({
		html: pinSvg("#ffba20", 40),
		iconAnchor: [20, 40],
		iconSize: [40, 40],
		className: "",
	});

	const placePinIcon = divIcon({
		html: pinSvg("#e4e4e7", 28),
		iconAnchor: [14, 28],
		iconSize: [28, 28],
		className: "",
	});

	const selectedPlacePinIcon = divIcon({
		html: pinSvg("#fafafa", 36),
		iconAnchor: [18, 36],
		iconSize: [36, 36],
		className: "",
	});

	function clusterIcon(count: number) {
		const size = count > 9 ? 40 : 36;
		return divIcon({
			html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:#171717;border:2px solid #ffba20;color:#ffba20;display:grid;place-items:center;font:700 13px/1 'IBM Plex Sans Variable',sans-serif;box-shadow:0 8px 18px rgb(0 0 0 / 40%)">${count}</div>`,
			iconAnchor: [size / 2, size / 2],
			iconSize: [size, size],
			className: "",
		});
	}

	function pinSvg(fill: string, size: number): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="${fill}" stroke="#000000" stroke-width="8px" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>`;
	}

	function labelFor(location: SavedLocation): string {
		return (
			location.displayName ??
			(location.senderId !== null
				? `#${location.senderId}`
				: "Shared location")
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
			? "Tap the map to place the circumference center."
			: overlays.mode === "ADD_MARKER"
				? "Tap the map to place the marker."
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
			aria-label="Back"
		>
			<CaretLeftIcon class="size-5" />
		</a>
		<h1 class="min-w-0 flex-1 text-xl font-semibold tracking-tight">Map</h1>
		<Button
			variant={overlays.mode === "ADD_CIRCLE" ||
			overlays.mode === "CIRCLE_CONFIGURATION"
				? "default"
				: "secondary"}
			size="icon"
			aria-label="Add circumference"
			title="Add circumference"
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
			aria-label="Add marker"
			title="Add marker"
			onclick={() => overlays.beginAddMarker()}
		>
			<MapPinPlusIcon class="size-5" />
		</Button>
	</header>

	<div class="relative min-h-0 flex-1">
		<div class="h-full w-full">
			<Map
				options={{
					center: [40.42267869390329, -3.697633348267032],
					zoom: 2,
					attributionControl: false,
				}}
				bind:instance={map}
			>
				<TileLayer
					url={"https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"}
					options={{
						maxZoom: 19,
						subdomains: "abcd",
						attribution:
							'&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer nofollow noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a>',
					}}
				/>
				<ControlAttribution options={{ prefix: undefined }} />

				{#each overlays.circles as circle (circle.id)}
					{@const live =
						overlays.circleDraft?.id === circle.id
							? overlays.circleDraft
							: circle}
					<Circle
						latLng={[circle.latitude, circle.longitude]}
						options={{
							radius: convertKmToMeters(live.radiusKm),
							color: live.color,
							weight:
								circle.id === overlays.selectedCircleId ||
								overlays.circleDraft?.id === circle.id
									? CIRCLE_SELECTED_WEIGHT
									: CIRCLE_WEIGHT,
							opacity: CIRCLE_STROKE_OPACITY,
							fillColor: live.color,
							fillOpacity: CIRCLE_FILL_OPACITY,
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
							overlays.selectCircle(circle.id);
						}}
					/>
				{/each}

				{#if overlays.circleDraft && !overlays.circleDraft.id}
					<Circle
						latLng={[
							overlays.circleDraft.latitude,
							overlays.circleDraft.longitude,
						]}
						options={{
							radius: convertKmToMeters(
								overlays.circleDraft.radiusKm,
							),
							color: overlays.circleDraft.color,
							weight: CIRCLE_WEIGHT,
							opacity: CIRCLE_STROKE_OPACITY,
							fillColor: overlays.circleDraft.color,
							fillOpacity: CIRCLE_FILL_OPACITY,
							dashArray: "6 4",
						}}
					/>
				{/if}

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
								title: `${cluster.markers.length} markers`,
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
							title: overlays.markerDraft.title || "New marker",
						}}
					/>
				{/if}

				{#if customLocation}
					<Marker
						latLng={[customLocation.lat, customLocation.lon]}
						options={{
							icon: userPinIcon,
							title: "Your location",
							zIndexOffset: 1000,
						}}
					>
						<Popup>
							<strong>Your location</strong><br />
							Custom position — independent from saved overlays.
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

		<MapHud
			{overlays}
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
