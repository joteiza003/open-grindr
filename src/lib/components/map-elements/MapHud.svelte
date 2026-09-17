<script lang="ts">
	import { MapPinIcon, TrashIcon, XIcon } from "phosphor-svelte";

	import CircleEditor from "$lib/components/map-elements/CircleEditor.svelte";
	import MarkerEditor from "$lib/components/map-elements/MarkerEditor.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import type { MarkerCluster } from "$lib/map/cluster-markers";
	import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import type { MapMarker } from "$lib/model/map-elements";

	let {
		overlays,
		modeHint = null,
		empty = false,
		openCluster = $bindable(null),
		confirmOpen = $bindable(false),
		selectedMarker = null,
		onPickMarker,
		onConfirmDelete,
	}: {
		overlays: MapElementsState;
		modeHint?: string | null;
		empty?: boolean;
		openCluster: Extract<MarkerCluster, { type: "group" }> | null;
		confirmOpen: boolean;
		selectedMarker?: MapMarker | null;
		onPickMarker: (marker: MapMarker) => void;
		onConfirmDelete: () => void | Promise<void>;
	} = $props();
</script>

{#if modeHint}
	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-1000 flex justify-center px-14"
	>
		<div
			class="pointer-events-auto flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-xl"
		>
			<p class="flex-1 text-sm">{modeHint}</p>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Cancel"
				onclick={() => overlays.cancelCreation()}
			>
				<XIcon class="size-4" />
			</Button>
		</div>
	</div>
{/if}

{#if empty}
	<div
		class="pointer-events-none absolute inset-0 z-1000 grid place-items-center p-8 text-center"
	>
		<div class="rounded-2xl bg-background/85 p-6">
			<h2 class="text-lg font-semibold">Map</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Add a circumference or a marker. Shared chat locations also
				appear here. Changing your custom location will not move saved
				overlays.
			</p>
		</div>
	</div>
{/if}

<div class="pointer-events-none absolute inset-x-0 bottom-4 z-1000 px-3">
	{#if overlays.mode === "CIRCLE_CONFIGURATION" && overlays.circleDraft}
		<CircleEditor
			draft={overlays.circleDraft}
			error={overlays.error}
			onchange={(patch) => overlays.updateCircleDraft(patch)}
			oncancel={() => overlays.cancelCreation()}
			onsave={() => void overlays.saveCircleDraft()}
			ondelete={overlays.circleDraft.id
				? () => (confirmOpen = true)
				: undefined}
		/>
	{:else if openCluster}
		<section
			class="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/95 p-3 shadow-2xl"
		>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-sm font-semibold">
					{openCluster.markers.length} markers
				</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close cluster"
					onclick={() => (openCluster = null)}
				>
					<XIcon class="size-4" />
				</Button>
			</div>
			<div class="max-h-48 overflow-auto">
				{#each openCluster.markers as marker (marker.id)}
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted/60"
						onclick={() => onPickMarker(marker)}
					>
						<MapPinIcon class="size-4 shrink-0" weight="fill" />
						<span class="truncate">{marker.title}</span>
					</button>
				{/each}
			</div>
		</section>
	{:else if overlays.mode === "MARKER_CONFIGURATION" && overlays.markerDraft}
		<MarkerEditor
			draft={overlays.markerDraft}
			error={overlays.error}
			onchange={(patch) => overlays.updateMarkerDraft(patch)}
			oncancel={() => overlays.cancelCreation()}
			onsave={() => void overlays.saveMarkerDraft()}
		/>
	{:else if overlays.mode === "SELECTED_MARKER" && selectedMarker}
		<section
			class="pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl"
		>
			<MapPinIcon class="size-5 shrink-0" weight="fill" />
			<div class="min-w-0 flex-1">
				<h2 class="truncate text-sm font-semibold">
					{selectedMarker.title}
				</h2>
				<p class="truncate text-xs text-muted-foreground">
					{selectedMarker.latitude.toFixed(4)}, {selectedMarker.longitude.toFixed(
						4,
					)}
				</p>
			</div>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => overlays.clearSelection()}
			>
				Close
			</Button>
			<Button
				variant="destructive"
				size="icon"
				aria-label="Delete"
				onclick={() => (confirmOpen = true)}
			>
				<TrashIcon class="size-4" />
			</Button>
		</section>
	{/if}
</div>

<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this item?</AlertDialog.Title>
			<AlertDialog.Description>
				It will be removed from the map and from local storage. This
				cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void onConfirmDelete()}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
