<script lang="ts">
	import {
		hydratePreferences,
		preferencesSnapshot,
	} from "$lib/app-data/preferences.svelte";
	import DataRefreshControl from "$lib/components/feedback/DataRefreshControl.svelte";
	import ScrollToTopButton from "$lib/components/shared/ScrollToTopButton.svelte";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { restoreScrollOnce } from "$lib/util/scroll-restore.svelte";
	import { revealedGridScrollTop } from "./grid-reveal";
	import Grid from "./Grid.svelte";
	import LocationChooser from "./LocationEmpty.svelte";
	import TopBar from "./top-bar/TopBar.svelte";

	const preferencesHydrated = hydratePreferences();
	const geohash = $derived(preferencesSnapshot().geohash);
	const oneHand = $derived(preferencesSnapshot().oneHandMode);

	let gridContainer: HTMLElement | null = $state(null);

	restoreScrollOnce({
		container: () => gridContainer,
		state: gridState,
		resolveTop: ({ scroller, savedTop }) => {
			const revealId = gridState.consumeReveal();
			if (revealId === null) return savedTop;
			return revealedGridScrollTop({
				scroller,
				savedTop,
				index: gridState.indexInProfiles(revealId),
			});
		},
	});
</script>

<svelte:head>
	<title>Euskal Grindr</title>
</svelte:head>
{#await preferencesHydrated then}
	{#if geohash === null}
		<main class="m-auto flex max-w-full flex-1">
			<LocationChooser />
		</main>
	{:else}
		<main class="screen-nav-host">
			<TopBar />
			<div
				class="pull-scroller"
				bind:this={gridContainer}
				onscroll={() =>
					(gridState.scrollY = gridContainer?.scrollTop ?? 0)}
			>
				<div
					data-slot="grid-content"
					class={[
						"@container/photo-grid flex min-h-overscrollable flex-col gap-4 px-4 pb-nav-clear",
						{
							"pt-fixed-header": oneHand,
							"pt-header-clear-17": !oneHand,
						},
					]}
					style:padding-bottom={oneHand
						? "calc(0.5rem + var(--content-pb) + var(--bar-content-gap) + 4.5rem)"
						: undefined}
				>
					<Grid {geohash} />
				</div>
			</div>
			{#if !gridState.loading && !gridState.error}
				<DataRefreshControl
					container={gridContainer}
					updating={gridState.refreshing}
					position="top"
					onrefresh={() =>
						void gridState.refresh({ keepLoadedPages: false })}
				/>
			{/if}
			<ScrollToTopButton
				container={gridContainer}
				class="bottom-nav-clear"
			/>
		</main>
	{/if}
{/await}
