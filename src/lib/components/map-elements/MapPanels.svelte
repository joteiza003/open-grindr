<script lang="ts">
	import MapClusterPanel from "$lib/components/map-elements/MapClusterPanel.svelte";
	import MapConfirmSheet from "$lib/components/map-elements/MapConfirmSheet.svelte";
	import MapListPanel from "$lib/components/map-elements/MapListPanel.svelte";
	import PlaceCard from "$lib/components/map-elements/PlaceCard.svelte";
	import { t } from "$lib/i18n";
	import {
		formatCoordinates,
		formatReceivedAt,
	} from "$lib/map/map-page-helpers";
	import type { MapScreenState } from "$lib/map/map-screen-state.svelte";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	let {
		screen,
		locationLabel,
		onPickPin,
		onPickShared,
		onOpenProfile,
		onDirections,
		onRefreshPin,
	}: {
		screen: MapScreenState;
		locationLabel: (location: SavedLocation) => string;
		onPickPin: (marker: MapMarker) => void;
		onPickShared: (location: SavedLocation) => void;
		onOpenProfile: (profileId: number) => void;
		onDirections: (place: { latitude: number; longitude: number }) => void;
		onRefreshPin: (marker: MapMarker) => void;
	} = $props();

	const panel = $derived(screen.visiblePanel);
</script>

<!-- Dims the map while a confirmation is up; tapping it cancels. The sheet has
     its own Cancel button, so this one stays out of the accessibility tree. -->
{#if screen.confirm}
	<button
		type="button"
		tabindex="-1"
		aria-hidden="true"
		class="pointer-events-auto absolute inset-0 z-20 bg-black/45"
		onclick={() => screen.cancelDelete()}
	></button>
{/if}

<div
	class="pointer-events-none absolute inset-x-0 bottom-3 z-30 px-3"
	data-map-panel={screen.panelToken}
>
	{#if screen.confirm}
		<MapConfirmSheet
			title={screen.confirmCopy.title}
			body={screen.confirmCopy.body}
			onCancel={() => screen.cancelDelete()}
			onConfirm={() => void screen.confirmDelete()}
		/>
	{:else if panel.kind === "cluster"}
		<MapClusterPanel
			markers={screen.clusterMembers}
			onPick={onPickPin}
			onClose={() => screen.closePanel()}
		/>
	{:else if panel.kind === "list"}
		<MapListPanel
			markers={screen.pins.markers}
			locations={screen.shared.locations}
			{locationLabel}
			onPickMarker={onPickPin}
			onPickLocation={onPickShared}
			onDeleteMarker={(marker) =>
				screen.requestDelete({ kind: "pin", id: marker.id })}
			onDeleteLocation={(location) =>
				screen.requestDelete({ kind: "shared", id: location.localId })}
			onDeleteAll={(kind) =>
				screen.requestDelete({
					kind: kind === "pins" ? "all-pins" : "all-shared",
				})}
			onClose={() => screen.closePanel()}
		/>
	{:else if screen.selectedPin}
		{@const pin = screen.selectedPin}
		<PlaceCard
			title={pin.displayName ?? pin.title}
			subtitle={formatCoordinates(pin.latitude, pin.longitude)}
			mediaHash={pin.mediaHash ?? null}
			profileId={pin.profileId ?? null}
			refreshing={screen.pins.refreshing}
			onClose={() => screen.closePanel()}
			{onOpenProfile}
			onDirections={() => onDirections(pin)}
			onRefresh={pin.profileId === undefined
				? undefined
				: () => onRefreshPin(pin)}
			onDelete={() => screen.requestDelete({ kind: "pin", id: pin.id })}
		/>
	{:else if screen.selectedShared}
		{@const place = screen.selectedShared}
		<PlaceCard
			title={locationLabel(place)}
			subtitle={formatCoordinates(place.lat, place.lon)}
			detail={formatReceivedAt(place.receivedAt)}
			onClose={() => screen.closePanel()}
			onDirections={() =>
				onDirections({ latitude: place.lat, longitude: place.lon })}
			onDelete={() =>
				screen.requestDelete({ kind: "shared", id: place.localId })}
		/>
	{:else if panel.kind === "me"}
		<PlaceCard
			title={t("map.yourLocation")}
			subtitle={t("map.customPosition")}
			onClose={() => screen.closePanel()}
		/>
	{/if}
</div>
