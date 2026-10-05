<script lang="ts">
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import CommandCenterTrigger from "$lib/components/command-center/CommandCenterTrigger.svelte";
	import ProgressiveBlur from "$lib/components/shared/ProgressiveBlur.svelte";
	import { savedFilters } from "$lib/grid/saved-filters-state.svelte";
	import { bottomChrome, topChrome } from "$lib/util/screen-chrome.svelte";
	import GridFilters from "../GridFilters.svelte";
	import LocationChange from "../LocationChange.svelte";
	import PresenceToggle from "./PresenceToggle.svelte";
	import BrowseViewModeToggle from "./BrowseViewModeToggle.svelte";
	import QuickFilters from "./QuickFilters.svelte";

	let openFilters = $state({ all: false, age: false, position: false });

	// Modo una mano: la barra baja, justo encima de la barra de navegación.
	const oneHand = $derived(preferencesSnapshot().oneHandMode);

	// Cuenta lo nuevo de los filtros guardados al abrir la rejilla (como mucho
	// una vez cada 15 minutos; nunca en segundo plano).
	$effect(() => {
		const geohash = preferencesSnapshot().geohash;
		if (geohash) void savedFilters.check({ geohash });
	});
</script>

{#snippet controls()}
	<div
		data-scroll-intent="x"
		class={[
			"scrollbar-thin flex items-center gap-1 overflow-x-auto px-4",
			{ "pt-2 pb-1": oneHand, "pt-0 pb-2": !oneHand },
		]}
	>
		<LocationChange />
		<PresenceToggle />
		<QuickFilters bind:openFilters />
		<CommandCenterTrigger />
		<BrowseViewModeToggle />
	</div>
{/snippet}

{#if oneHand}
	<ProgressiveBlur
		data-one-hand-bar
		class="fixed left-0 z-10 w-full"
		style="bottom: var(--content-pb)"
		bgClass="bg-linear-to-t from-background to-transparent"
		contentClass="flex flex-col"
		direction="bottomToTop"
		{@attach bottomChrome}
	>
		{@render controls()}
	</ProgressiveBlur>
{:else}
	<ProgressiveBlur
		data-fixed-header
		class="fixed top-0 left-0 z-10 w-full"
		bgClass="bg-linear-to-b from-background to-transparent"
		contentClass="flex flex-col pt-fixed-header"
		direction="topToBottom"
		{@attach topChrome}
	>
		{@render controls()}
	</ProgressiveBlur>
{/if}
<GridFilters bind:open={openFilters.all} />
