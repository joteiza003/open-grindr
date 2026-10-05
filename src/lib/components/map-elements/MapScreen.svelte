<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import MapCanvas from "$lib/components/map-elements/MapCanvas.svelte";
	import MapControls from "$lib/components/map-elements/MapControls.svelte";
	import MapHeader from "$lib/components/map-elements/MapHeader.svelte";
	import MapPanels from "$lib/components/map-elements/MapPanels.svelte";
	import { leaveMap } from "$lib/map/leave-map";
	import {
		allMapPoints,
		directionsUrl,
		initialMapTarget,
		locationLabel,
		sharedPins,
	} from "$lib/map/map-page-helpers";
	import { MapScreenState } from "$lib/map/map-screen-state.svelte";
	import { startTrace, trace } from "$lib/map/map-trace";
	import { decodeGeohash } from "$lib/model/geohash";
	import { dismissOnBackGesture } from "$lib/platform/back-gesture-event.svelte";
	import { openExternalLink } from "$lib/platform/link-opener";
	import type { MapView, MapViewHandlers } from "$lib/map/map-view";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	/** Height a bottom panel takes, so a tapped pin is panned clear of it. */
	const PANEL_CLEARANCE_PX = 240;

	const screen = new MapScreenState();
	let root: HTMLElement | undefined = $state();
	let view = $state.raw<MapView>();
	let tilesWorking = $state(true);

	onMount(() => {
		void screen.load();
		return root ? startTrace(root) : undefined;
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

	const me = $derived(
		customLocation
			? { latitude: customLocation.lat, longitude: customLocation.lon }
			: null,
	);
	const shared = $derived(sharedPins(screen.shared.locations));
	const hasPoints = $derived(
		screen.pins.markers.length > 0 ||
			screen.shared.locations.length > 0 ||
			customLocation !== null,
	);

	// Frame the map once, as soon as the view and the saved data are ready.
	let centered = false;
	$effect(() => {
		if (!view || centered) return;
		if (screen.pins.loading || screen.shared.loading) return;
		const target = initialMapTarget(
			customLocation,
			screen.shared.locations,
			screen.pins.markers,
		);
		if (!target) return;
		view.setView(target.latitude, target.longitude, target.zoom, {
			animate: false,
		});
		centered = true;
	});

	function revealPin(id: string) {
		const pin = screen.pins.markerById(id);
		if (pin) view?.reveal(pin.latitude, pin.longitude, PANEL_CLEARANCE_PX);
	}

	function revealShared(id: string) {
		const place = screen.shared.locationById(id);
		if (place) view?.reveal(place.lat, place.lon, PANEL_CLEARANCE_PX);
	}

	const handlers: MapViewHandlers = {
		onPinTap: (id) => {
			screen.selectPin(id);
			revealPin(id);
		},
		onSharedTap: (id) => {
			screen.selectShared(id);
			revealShared(id);
		},
		onMeTap: () => screen.selectMe(),
		onClusterTap: (markers) => {
			if (!view?.zoomToMarkers(markers)) {
				screen.openCluster(markers.map((marker) => marker.id));
			}
		},
		onMapTap: () => screen.mapTapped(),
		onTilesChange: (working) => (tilesWorking = working),
	};

	function fitAll() {
		view?.fitPoints(
			allMapPoints(
				screen.pins.markers,
				screen.shared.locations,
				customLocation,
			),
		);
	}

	function goToMyLocation() {
		if (customLocation)
			view?.focus(customLocation.lat, customLocation.lon, 13);
	}

	function pickPin(marker: MapMarker) {
		screen.selectPin(marker.id);
		view?.focus(marker.latitude, marker.longitude, 16);
	}

	function pickShared(location: SavedLocation) {
		screen.selectShared(location.localId);
		view?.focus(location.lat, location.lon, 14);
	}

	async function refreshPin(marker: MapMarker) {
		const next = await screen.refreshOne(marker);
		if (next) view?.focus(next.latitude, next.longitude, 15);
	}

	// System back closes the innermost open panel before leaving the map.
	dismissOnBackGesture({
		active: () => true,
		dismiss: () => {
			trace("system back");
			if (!screen.back()) leaveMap();
		},
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === "Escape" && screen.back()) event.preventDefault();
	}}
/>

<!-- `pointer-events-auto` keeps the whole screen tappable even if a dialog
     elsewhere in the app left `pointer-events: none` behind on <body>. -->
<main
	bind:this={root}
	class="pointer-events-auto relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<MapHeader
		listOpen={screen.visiblePanel.kind === "list"}
		refreshDisabled={!screen.hasProfilePins || screen.pins.refreshing}
		refreshing={screen.pins.refreshing}
		onBack={leaveMap}
		onRefresh={() => void screen.refreshAll()}
		onToggleList={() => screen.toggleList()}
		onTitleLongPress={() => screen.openTrace()}
	/>

	<div class="relative min-h-0 flex-1 overflow-hidden">
		<MapCanvas
			pins={screen.pins.markers}
			{shared}
			{me}
			selection={screen.selection}
			{handlers}
			onReady={(instance) => (view = instance)}
		/>
		<MapControls
			canFit={hasPoints}
			canLocate={customLocation !== null}
			status={screen.refreshStatus}
			{tilesWorking}
			empty={screen.empty}
			onFit={fitAll}
			onLocate={goToMyLocation}
		/>
		<MapPanels
			{screen}
			{locationLabel}
			onPickPin={pickPin}
			onPickShared={pickShared}
			onOpenProfile={(profileId) => void goto(`/profile/${profileId}`)}
			onDirections={(place) =>
				openExternalLink(directionsUrl(place, customLocation))}
			onRefreshPin={(marker) => void refreshPin(marker)}
		/>
	</div>
</main>
