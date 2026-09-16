<script lang="ts">
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import ApiErrorDisplay from "$lib/components/feedback/ApiErrorDisplay.svelte";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { observeIntersection } from "$lib/util/observe-intersection";
	import { virtualGrid } from "$lib/util/virtual-grid.svelte";
	import type { GridProfile } from "$lib/grid/grid";
	import EmptyGrid from "./EmptyGrid.svelte";
	import GridCellSkeleton from "./GridCellSkeleton.svelte";
	import GridProfileMiniCard from "./GridProfileMiniCard.svelte";

	const PAGE_SKELETONS = 20;

	let { geohash }: { geohash: string } = $props();

	let gridElement: HTMLElement | null = $state(null);

	// Grindr's cascade can return profiles shuffled (especially once filters are
	// applied), interleaving near and far. Sort by distance in the presentation
	// layer for a stable, closest-first order without touching gridState, the
	// API, or virtualization. Unresolved "lazy" profiles carry no distance yet,
	// so they sort to the end until they resolve; the sort is stable, so equal
	// distances keep the server's original order.
	function gridDistance(profile: GridProfile): number {
		return profile.type === "rendered" && profile.distance !== null
			? profile.distance
			: Number.POSITIVE_INFINITY;
	}

	const gridProfiles = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- built and spread inside this $derived, never mutated afterwards
		const byId = new Map<number, GridProfile>();
		for (const item of gridState.items) {
			const existing = byId.get(item.id);
			if (
				!existing ||
				(existing.type === "lazy" && item.type === "rendered")
			) {
				byId.set(item.id, item);
			}
		}
		return [...byId.values()].sort(
			(a, b) => gridDistance(a) - gridDistance(b),
		);
	});

	const browsePreferences = $derived(preferencesSnapshot().browse);

	const cardVariant = $derived(
		browsePreferences.viewMode === "grid"
			? "standard"
			: browsePreferences.viewMode,
	);

	// Optional per-user overrides applied inline so the default grid (and its
	// e2e corner test) stays untouched unless the user opts in.
	const cardRadiusVar = $derived(
		browsePreferences.cardRadius !== null
			? `${browsePreferences.cardRadius}px`
			: undefined,
	);
	const cardGapVar = $derived(
		browsePreferences.cardGap !== null
			? `${browsePreferences.cardGap}px`
			: undefined,
	);

	const pendingSkeletons = $derived(
		gridState.loadingMore ? PAGE_SKELETONS : 0,
	);
	const view = virtualGrid({
		grid: () => gridElement,
		count: () => gridProfiles.length + pendingSkeletons,
	});
	const visibleProfiles = $derived(
		gridProfiles.slice(view.startIndex, view.endIndex),
	);
	const visibleSkeletons = $derived(
		Math.max(
			0,
			view.endIndex - Math.max(view.startIndex, gridProfiles.length),
		),
	);

	$effect.pre(() => {
		gridState.load(geohash);
	});

	$effect(() => {
		gridState.viewActive = true;
		return () => {
			gridState.viewActive = false;
		};
	});
</script>

<div class="relative flex flex-1 flex-col">
	<div
		bind:this={gridElement}
		class={["photo-grid", `photo-grid-${cardVariant}`]}
		style:padding-top="{view.paddingTopPx}px"
		style:padding-bottom="{view.paddingBottomPx}px"
		style:--radius-grid={cardRadiusVar}
		style:gap={cardGapVar}
		data-rows-above={view.hasRowsAbove || undefined}
		data-rows-below={view.hasRowsBelow || undefined}
	>
		{#if gridState.loading && gridProfiles.length === 0}
			{#each Array.from({ length: PAGE_SKELETONS })}
				<GridCellSkeleton />
			{/each}
		{:else if gridState.error && gridProfiles.length === 0}
			<div class="col-span-full flex p-4">
				<ApiErrorDisplay
					error={gridState.error}
					onRetry={() => gridState.retry()}
					class="m-auto"
				/>
			</div>
		{:else}
			{#if gridProfiles.length === 0}
				<EmptyGrid />
			{/if}
			{#each visibleProfiles as item (item.id)}
				{#if item.type === "rendered"}
					<GridProfileMiniCard
						id={item.id}
						displayName={item.displayName}
						distance={item.distance}
						unread={item.unread}
						onlineUntil={item.onlineUntil}
						isFavorite={item.isFavorite}
						isVisiting={item.isVisiting}
						hadRecentChat={item.hasChattedInLast24Hrs}
						variant={cardVariant}
						medias={item.profilePhotosHashes?.map((mediaHash) => ({
							mediaHash,
						})) ?? []}
					/>
				{:else}
					<GridCellSkeleton
						onVisible={() => {
							gridState
								.resolveProfile(item.id)
								.catch((error) => console.error(error));
						}}
					/>
				{/if}
			{/each}
			{#each Array.from({ length: visibleSkeletons })}
				<GridCellSkeleton />
			{/each}
		{/if}
	</div>
	<div role="status" class="sr-only">
		{#if gridState.loadingMore}
			Loading more profiles
		{/if}
	</div>
	{#if gridState.nextPage !== 0 && gridState.nextPage !== null}
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-px"
			use:observeIntersection={{
				handle: () => gridState.loadMore(),
				rootMargin: "400px",
			}}
		></div>
	{/if}
</div>
