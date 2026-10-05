<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import MapCanvas from "$lib/components/map-elements/MapCanvas.svelte";
	import MapControls from "$lib/components/map-elements/MapControls.svelte";
	import MapHeader from "$lib/components/map-elements/MapHeader.svelte";
	import MapPanels from "$lib/components/map-elements/MapPanels.svelte";
	import { t } from "$lib/i18n";
	import { type BaseLayerKind, otherBaseLayer } from "$lib/map/base-layers";
	import { leaveMap } from "$lib/map/leave-map";
	import {
		allMapPoints,
		directionsUrl,
		initialMapTarget,
		locationLabel,
		sharedPins,
	} from "$lib/map/map-page-helpers";
	import { MapScreenState } from "$lib/map/map-screen-state.svelte";
	import {
		panelOnScreen,
		startTrace,
		trace,
		traceReport,
	} from "$lib/map/map-trace";
	import { lastSelfHeal, reloadOnce } from "$lib/map/self-heal";
	import {
		closeTraceOverlay,
		showTraceOverlay,
	} from "$lib/map/trace-overlay";
	import { decodeGeohash } from "$lib/model/geohash";
	import { dismissOnBackGesture } from "$lib/platform/back-gesture-event.svelte";
	import { openExternalLink } from "$lib/platform/link-opener";
	import type { MapView, MapViewHandlers } from "$lib/map/map-view";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	/** Height a bottom panel takes, so a tapped pin is panned clear of it. */
	const PANEL_CLEARANCE_PX = 240;
	/** The panel area floats this far above the bottom edge of the map. */
	const PANEL_GAP_PX = 12;
	/** The Center button on a card never leaves the map zoomed out further than this. */
	const CENTER_MIN_ZOOM = 15;

	const screen = new MapScreenState();
	let root: HTMLElement | undefined = $state();
	let view = $state.raw<MapView>();
	let tilesWorking = $state(true);
	/** Bumped every second and written to the DOM: proof the screen still redraws. */
	let heartbeat = $state(0);
	/** Set once the layer button is used; until then the saved choice shows. */
	let chosenLayer = $state<BaseLayerKind | null>(null);
	const baseLayer = $derived(chosenLayer ?? preferencesSnapshot().mapLayer);

	/** The map changes first; saving the choice follows and never holds it up. */
	function toggleLayer() {
		const next = otherBaseLayer(baseLayer);
		chosenLayer = next;
		setPreferences({ mapLayer: next }).catch((error: unknown) => {
			console.error("[map] could not save the map layer", error);
			toast.error(t("map.saveFailed"));
		});
	}

	function showDiagnostics({ autoCopy = false } = {}) {
		const restarted = lastSelfHeal();
		showTraceOverlay(
			{
				title: t("map.traceTitle"),
				hint: t("map.traceHint"),
				copy: t("map.traceCopy"),
				reload: t("map.traceReload"),
				home: t("map.traceHome"),
				close: t("common.close"),
				copied: t("map.traceCopied"),
				copyFailed: t("map.traceCopyFailed"),
			},
			traceReport({
				...screen.traceFacts(),
				// What the screen shows against what the state says: tells a screen
				// that stopped redrawing from one that stopped being painted.
				"panel on screen": root ? panelOnScreen(root) : "unknown",
				"heartbeat in state": heartbeat,
				"heartbeat on screen":
					root?.getAttribute("data-map-heartbeat") ?? "missing",
				...(restarted ? { "last automatic restart": restarted } : {}),
			}),
			{ autoCopy },
		);
	}

	onMount(() => {
		void screen.load();
		screen.profiles.start();
		const beat = setInterval(() => (heartbeat += 1), 1_000);
		const stopTrace = root
			? startTrace(root, {
					expectedPanel: () => screen.panelToken,
					expectedBeat: () => heartbeat,
					// A screen that stopped following its state cannot repair
					// itself; start it over, or show why if that already happened.
					onDesync: (detail) => {
						if (!reloadOnce(detail))
							showDiagnostics({ autoCopy: true });
					},
					onDeadTaps: () => showDiagnostics({ autoCopy: true }),
				})
			: undefined;
		return () => {
			clearInterval(beat);
			screen.profiles.stop();
			void screen.filters.flush();
			stopTrace?.();
			closeTraceOverlay();
		};
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
	const shared = $derived(sharedPins(screen.visibleShared));
	const hasPoints = $derived(
		screen.visiblePins.length > 0 ||
			screen.visibleShared.length > 0 ||
			customLocation !== null,
	);
	/** How many of what exists the filters show, while they hide any. */
	const summary = $derived(
		screen.filtering && screen.shown < screen.total
			? { shown: screen.shown, total: screen.total }
			: null,
	);
	const profileNotice = $derived.by(() => {
		if (!screen.filtering) return null;
		if (screen.profiles.lookup === "failed") return "failed";
		return screen.profiles.pending ? "loading" : null;
	});

	// Look after the profiles behind the pins: who is online, and the rest of
	// their profile while a filter needs it. Nothing waits for the answers.
	$effect(() => {
		screen.profiles.track(screen.profileIds, {
			details: screen.filters.compiled.needs.details,
		});
	});
	// The filters are edited in place by the filter fields; save them shortly
	// after the editing stops.
	$effect(() => {
		$state.snapshot(screen.filters.value);
		screen.filters.saveSoon();
	});

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
				screen.visiblePins,
				screen.visibleShared,
				customLocation,
			),
		);
	}

	function goToMyLocation() {
		if (customLocation)
			view?.focus(customLocation.lat, customLocation.lon, 13);
	}

	/** Puts a place in the middle of what the open card leaves uncovered. */
	function centerOnPlace(place: { latitude: number; longitude: number }) {
		const panel = root?.querySelector<HTMLElement>("[data-map-panel]");
		view?.centerOn(place.latitude, place.longitude, {
			bottomInset: panel
				? panel.offsetHeight + PANEL_GAP_PX
				: PANEL_CLEARANCE_PX,
			minZoom: CENTER_MIN_ZOOM,
		});
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
	data-map-heartbeat={heartbeat}
	class="pointer-events-auto relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<MapHeader
		listOpen={screen.visiblePanel.kind === "list"}
		filtersOpen={screen.visiblePanel.kind === "filters"}
		filterCount={screen.filters.count}
		refreshDisabled={!screen.hasProfilePins || screen.pins.refreshing}
		refreshing={screen.pins.refreshing}
		onBack={leaveMap}
		onRefresh={() => void screen.refreshAll()}
		onToggleList={() => screen.toggleList()}
		onToggleFilters={() => screen.toggleFilters()}
		onTitleLongPress={() => showDiagnostics()}
	/>

	<div class="relative min-h-0 flex-1 overflow-hidden">
		<MapCanvas
			pins={screen.visiblePins}
			{shared}
			{me}
			selection={screen.selection}
			layer={baseLayer}
			online={screen.onlineProfileIds}
			{handlers}
			onReady={(instance) => (view = instance)}
		/>
		<MapControls
			canFit={hasPoints}
			canLocate={customLocation !== null}
			layer={baseLayer}
			status={screen.refreshStatus}
			{tilesWorking}
			empty={screen.empty}
			{summary}
			{profileNotice}
			onFit={fitAll}
			onLocate={goToMyLocation}
			onToggleLayer={toggleLayer}
			onClearFilters={() => screen.filters.clear()}
		/>
		<MapPanels
			{screen}
			{locationLabel}
			onPickPin={pickPin}
			onPickShared={pickShared}
			onOpenProfile={(profileId) => void goto(`/profile/${profileId}`)}
			onCenter={centerOnPlace}
			onDirections={(place) =>
				openExternalLink(directionsUrl(place, customLocation))}
			onRefreshPin={(marker) => void refreshPin(marker)}
		/>
	</div>
</main>
