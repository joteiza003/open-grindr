<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import { onMount, tick } from "svelte";

	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import { trace } from "$lib/map/map-trace";
	import {
		type MapSelection,
		MapView,
		type MapViewHandlers,
		type MePoint,
		type SharedPin,
	} from "$lib/map/map-view";
	import type { MapMarker } from "$lib/model/map-elements";

	let {
		pins,
		shared,
		me,
		selection,
		handlers,
		onReady,
	}: {
		pins: MapMarker[];
		shared: SharedPin[];
		me: MePoint | null;
		selection: MapSelection;
		handlers: MapViewHandlers;
		/** Called with the view once it exists, and with undefined when it goes. */
		onReady?: (view: MapView | undefined) => void;
	} = $props();

	let host: HTMLDivElement | undefined = $state();
	let view = $state.raw<MapView>();
	/** Why the map could not start. The rest of the screen keeps working. */
	let failure = $state<string | null>(null);
	/** Bumped to get a fresh element: Leaflet cannot reuse a failed container. */
	let attempt = $state(0);

	function start() {
		if (!host) return;
		try {
			const created = new MapView(
				host,
				{
					onPinTap: (id) => handlers.onPinTap(id),
					onSharedTap: (id) => handlers.onSharedTap(id),
					onMeTap: () => handlers.onMeTap(),
					onClusterTap: (markers) => handlers.onClusterTap(markers),
					onMapTap: () => handlers.onMapTap(),
					onTilesChange: (working) =>
						handlers.onTilesChange?.(working),
				},
				{
					cluster: (count) => t("map.markerCount", { count }),
					me: () => t("map.yourLocation"),
				},
			);
			view = created;
			failure = null;
			onReady?.(created);
		} catch (error) {
			console.error("[map] could not start", error);
			trace("the map could not start");
			failure = error instanceof Error ? error.message : String(error);
		}
	}

	function stop() {
		const current = view;
		view = undefined;
		if (current) onReady?.(undefined);
		current?.destroy();
	}

	async function retry() {
		stop();
		attempt += 1;
		await tick();
		start();
	}

	onMount(() => {
		start();
		return stop;
	});

	$effect(() => {
		view?.setPins($state.snapshot(pins));
	});
	$effect(() => {
		view?.setShared($state.snapshot(shared));
	});
	$effect(() => {
		view?.setMe(me);
	});
	$effect(() => {
		view?.setSelection(selection);
	});
</script>

<!-- The map lives in its own stacking context (`isolation`), so the z-index
     values Leaflet uses internally (up to 1000) can never rise above the
     panels and buttons drawn over it. -->
{#key attempt}
	<div
		bind:this={host}
		class="og-map"
		role="application"
		aria-label={t("map.title")}
	></div>
{/key}

{#if failure}
	<div class="absolute inset-0 grid place-items-center p-6">
		<div
			class="flex max-w-sm flex-col items-center gap-3 text-center"
			role="alert"
		>
			<p class="text-base font-semibold">{t("map.errorTitle")}</p>
			<p class="text-xs break-words text-muted-foreground">{failure}</p>
			<Button variant="secondary" onclick={retry}>{t("map.retry")}</Button
			>
		</div>
	</div>
{/if}

<style>
	.og-map {
		position: absolute;
		inset: 0;
		z-index: 0;
		isolation: isolate;
		background: var(--color-neutral-800, #27272a);
		-webkit-tap-highlight-color: transparent;
	}

	:global(.og-map.leaflet-container .leaflet-control-attribution) {
		background: rgb(255 255 255 / 75%);
		border-radius: 8px 0 0 0;
		font-size: 10px;
		padding: 2px 6px;
	}

	:global(.og-pin-icon) {
		background: transparent;
		border: 0;
	}

	:global(.og-pin) {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	:global(.og-pin--avatar) {
		padding: 3px;
		box-sizing: border-box;
	}

	:global(.og-pin__disc) {
		position: relative;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
		border: 2px solid #ffffff;
		border-radius: 999px;
		background: #27272a;
		box-shadow: 0 4px 14px rgb(0 0 0 / 45%);
		transition:
			transform 180ms ease,
			border-color 180ms ease;
	}

	:global(.og-pin__initial) {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #d4d4d8;
		font: 700 15px/1 var(--font-sans, sans-serif);
	}

	:global(.og-pin__photo) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 200ms ease;
	}

	:global(.og-pin__photo.is-loaded) {
		opacity: 1;
	}

	:global(.og-pin--avatar.is-selected .og-pin__disc) {
		border-color: #ffba20;
		transform: scale(1.2);
	}

	:global(.og-pin__svg) {
		display: block;
		width: 100%;
		height: 100%;
		fill: currentcolor;
		stroke: #000000;
		stroke-width: 8px;
		transform-origin: 50% 100%;
		transition:
			transform 180ms ease,
			color 180ms ease;
	}

	:global(.og-pin--place) {
		color: #e4e4e7;
	}

	:global(.og-pin--shared) {
		color: #ffba20;
	}

	:global(.og-pin--place.is-selected) {
		color: #ffffff;
	}

	:global(.og-pin--place.is-selected .og-pin__svg),
	:global(.og-pin--shared.is-selected .og-pin__svg) {
		transform: scale(1.25);
	}

	:global(.og-pin--me) {
		display: grid;
		place-items: center;
	}

	:global(.og-pin__dot) {
		width: 16px;
		height: 16px;
		box-sizing: border-box;
		border: 3px solid #ffffff;
		border-radius: 999px;
		background: #ffba20;
		box-shadow: 0 0 0 6px rgb(255 186 32 / 28%);
		transition: transform 180ms ease;
	}

	:global(.og-pin--me.is-selected .og-pin__dot) {
		transform: scale(1.35);
	}

	:global(.og-pin--cluster) {
		display: grid;
		place-items: center;
	}

	:global(.og-pin__count) {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		border: 2px solid #ffba20;
		border-radius: 999px;
		background: #171717;
		color: #ffba20;
		font: 700 13px/1 var(--font-sans, sans-serif);
		box-shadow: 0 8px 18px rgb(0 0 0 / 40%);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.og-pin__disc),
		:global(.og-pin__svg),
		:global(.og-pin__dot),
		:global(.og-pin__photo) {
			transition: none;
		}
	}
</style>
