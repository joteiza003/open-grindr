<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import { divIcon, type Map as LeafletMap } from "leaflet";
	import { CaretLeftIcon } from "phosphor-svelte";
	import {
		ControlAttribution,
		Map,
		Marker,
		Popup,
		TileLayer,
	} from "sveaflet";
	import { onMount } from "svelte";

	import { SavedLocationsState } from "$lib/chat/saved-locations-state.svelte";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	const library = new SavedLocationsState();
	let map: LeafletMap | undefined = $state();

	onMount(() => {
		void library.load();
	});

	// Recenter on the most recent shared location once the library loads.
	$effect(() => {
		const first = library.locations[0];
		if (!map || first === undefined) return;
		map.setView([first.lat, first.lon], 11);
	});

	const pinIcon = divIcon({
		html: '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="36" height="36" fill="#ffba20" stroke="#000000" stroke-width="8px" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>',
		iconAnchor: [18, 36],
		iconSize: [36, 36],
		className: "",
	});

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
		<h1 class="text-xl font-semibold tracking-tight">Shared locations</h1>
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
					url={"https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
					options={{
						maxZoom: 19,
						attribution:
							'&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer nofollow noopener">OpenStreetMap</a> &nbsp;',
					}}
				/>
				<ControlAttribution options={{ prefix: undefined }} />
				{#each library.locations as location (location.localId)}
					<Marker
						latLng={[location.lat, location.lon]}
						options={{ icon: pinIcon, title: labelFor(location) }}
					>
						<Popup>
							<strong>{labelFor(location)}</strong><br />
							{when(location.receivedAt)}
						</Popup>
					</Marker>
				{/each}
			</Map>
		</div>

		{#if !library.loading && library.locations.length === 0}
			<div
				class="pointer-events-none absolute inset-0 z-1000 grid place-items-center p-8 text-center"
			>
				<div class="rounded-2xl bg-background/85 p-6 backdrop-blur">
					<h2 class="text-lg font-semibold">No shared locations</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						When someone sends you their location in a chat, it
						appears here.
					</p>
				</div>
			</div>
		{/if}
	</div>
</main>
