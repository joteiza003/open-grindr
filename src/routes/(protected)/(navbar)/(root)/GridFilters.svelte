<script lang="ts">
	import { untrack } from "svelte";

	import FilterFields from "$lib/components/filters/FilterFields.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Sheet from "$lib/components/ui/sheet";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import {
		countActiveFilters,
		defaultFilters,
	} from "$lib/model/browse/grid/filters";
	import { dismissOnBackGesture } from "$lib/platform/back-gesture-event.svelte";

	let { open = $bindable() }: { open: boolean } = $props();

	let filters = $state(gridState.filters.snapshot());

	$effect(() => {
		if (open) {
			filters = untrack(() => gridState.filters.snapshot());
		}
	});

	let contentScroll = $state(0);

	const activeFilterCount = $derived(countActiveFilters(filters));

	dismissOnBackGesture({
		active: () => open,
		dismiss: () => {
			open = false;
		},
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		side="bottom"
		class="mt-(--safe-area-top) mb-(--safe-area-bottom) max-h-screen-safe"
	>
		<Sheet.Header
			class={[
				"border border-x-0 border-t-0 border-transparent p-4 transition-colors",
				{ "border-muted": contentScroll > 0 },
			]}
		>
			<div class="flex items-center justify-between gap-3">
				<Sheet.Title>Filters</Sheet.Title>
				{#if activeFilterCount > 0}
					<span
						class="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-semibold text-primary"
						>{activeFilterCount} active</span
					>
				{/if}
			</div>
		</Sheet.Header>
		<div
			class="flex max-h-full min-h-0 w-full flex-1 shrink gap-4 overflow-auto px-4 py-1 pb-4 *:flex-1 *:flex-col *:gap-4 **:break-inside-avoid max-lg:flex-col lg:gap-12"
			onscroll={(event) => {
				if (event.target instanceof HTMLDivElement) {
					contentScroll =
						event.target.scrollTop /
						(event.target.scrollHeight - event.target.clientHeight);
				}
			}}
		>
			<FilterFields bind:filters />
		</div>
		<Sheet.Footer
			class={[
				"border border-x-0 border-b-0 border-transparent p-4 transition-colors sm:items-end",
				{ "border-muted": contentScroll < 1 },
			]}
		>
			<div class="flex w-full items-center gap-2 sm:w-auto">
				<Button
					variant="ghost"
					disabled={activeFilterCount === 0}
					onclick={() => (filters = structuredClone(defaultFilters))}
				>
					Reset
				</Button>
				<Button
					type="submit"
					onclick={() => {
						gridState.filters.set(filters);
						open = false;
					}}
				>
					Apply{activeFilterCount > 0
						? ` (${activeFilterCount})`
						: ""}
				</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
