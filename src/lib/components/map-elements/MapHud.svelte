<script lang="ts">
	import { goto } from "$app/navigation";
	import { MapPinIcon, TrashIcon, XIcon } from "phosphor-svelte";

	import SelectedMarkerCard from "$lib/components/map-elements/SelectedMarkerCard.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { MarkerCluster } from "$lib/map/cluster-markers";
	import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	let {
		overlays,
		empty = false,
		openCluster = $bindable(null),
		confirmOpen = $bindable(false),
		selectedMarker = null,
		listOpen = $bindable(false),
		locations = [],
		locationLabel = () => "",
		onPickLocation,
		onDeleteLocation,
		onDeleteMarker,
		onDeleteAll,
		confirmTitle = t("map.deleteTitle"),
		confirmBody = t("map.deleteBody"),
		onPickMarker,
		onConfirmDelete,
		onOpenProfile,
		onOpenDirections,
	}: {
		overlays: MapElementsState;
		empty?: boolean;
		openCluster: Extract<MarkerCluster, { type: "group" }> | null;
		confirmOpen: boolean;
		selectedMarker?: MapMarker | null;
		listOpen?: boolean;
		locations?: SavedLocation[];
		locationLabel?: (location: SavedLocation) => string;
		onPickLocation?: (location: SavedLocation) => void;
		onDeleteLocation?: (location: SavedLocation) => void;
		onDeleteMarker?: (marker: MapMarker) => void;
		onDeleteAll?: (kind: "markers" | "locations") => void;
		confirmTitle?: string;
		confirmBody?: string;
		onPickMarker: (marker: MapMarker) => void;
		onConfirmDelete: () => void | Promise<void>;
		onOpenProfile?: (profileId: number) => void;
		onOpenDirections?: (marker: MapMarker) => void;
	} = $props();

	const listVisible = $derived(listOpen && overlays.mode === "NORMAL");

	function openProfile(id: number) {
		(onOpenProfile ?? ((pid: number) => void goto(`/profile/${pid}`)))(id);
	}
</script>

<!-- Empty state -->
{#if empty}
	<div
		class="pointer-events-none absolute inset-x-0 bottom-10 z-1000 flex justify-center px-4"
	>
		<div
			class="max-w-md rounded-2xl border border-border/80 bg-card/95 px-4 py-3 text-center shadow-xl"
		>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{t("map.empty")}
			</p>
		</div>
	</div>
{/if}

<!-- Bottom panels -->
<div class="pointer-events-none absolute inset-x-0 bottom-4 z-1000 px-3">
	{#if openCluster}
		<!-- Cluster list -->
		<section
			class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl"
		>
			<div
				class="flex items-center justify-between border-b border-border/60 px-4 py-3"
			>
				<h2 class="text-sm font-semibold">
					{t("map.markerCount", {
						count: openCluster.markers.length,
					})}
				</h2>
				<Button
					variant="ghost"
					size="icon"
					class="size-8 rounded-full text-foreground"
					aria-label={t("map.closeCluster")}
					onclick={() => (openCluster = null)}
				>
					<XIcon class="size-4" />
				</Button>
			</div>
			<div class="max-h-52 overflow-y-auto overscroll-contain p-2">
				{#each openCluster.markers as marker (marker.id)}
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
						onclick={() => onPickMarker(marker)}
					>
						{#if marker.mediaHash}
							<span
								class="size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
							>
								<UserAvatar
									mediaHash={marker.mediaHash}
									class="size-9"
									size="md"
								/>
							</span>
						{:else}
							<span
								class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
							>
								<MapPinIcon class="size-4" weight="fill" />
							</span>
						{/if}
						<span
							class="min-w-0 flex-1 truncate text-sm font-medium"
						>
							{marker.displayName ?? marker.title}
						</span>
					</button>
				{/each}
			</div>
		</section>
	{:else if listVisible}
		<!-- Saved elements list -->
		<section
			class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl"
			aria-label={t("map.list")}
		>
			<div
				class="flex items-center justify-between border-b border-border/60 px-4 py-3"
			>
				<h2 class="text-sm font-semibold">{t("map.list")}</h2>
				<Button
					variant="ghost"
					size="icon"
					class="size-8 rounded-full text-foreground"
					aria-label={t("common.close")}
					onclick={() => (listOpen = false)}
				>
					<XIcon class="size-4" />
				</Button>
			</div>

			<div
				class="max-h-60 space-y-1 overflow-y-auto overscroll-contain p-2"
			>
				{#if overlays.markers.length === 0 && locations.length === 0}
					<p
						class="px-3 py-6 text-center text-sm text-muted-foreground"
					>
						{t("map.listEmpty")}
					</p>
				{/if}

				{#if overlays.markers.length > 0}
					<div class="flex items-center justify-between pe-1">
						<p
							class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{t("map.markersHeading")}
						</p>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-xs text-destructive hover:text-destructive"
							onclick={() => onDeleteAll?.("markers")}
						>
							{t("map.deleteAll")}
						</Button>
					</div>
					{#each overlays.markers as marker (marker.id)}
						<div
							class="flex w-full items-center gap-1 rounded-2xl px-3 py-0.5 transition-colors hover:bg-muted/70"
						>
							<button
								type="button"
								class="flex min-w-0 flex-1 items-center gap-3 py-2 text-left active:opacity-70"
								onclick={() => onPickMarker(marker)}
							>
								{#if marker.mediaHash}
									<span
										class="size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
									>
										<UserAvatar
											mediaHash={marker.mediaHash}
											class="size-9"
											size="md"
										/>
									</span>
								{:else}
									<span
										class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
									>
										<MapPinIcon
											class="size-4"
											weight="fill"
										/>
									</span>
								{/if}
								<span
									class="min-w-0 flex-1 truncate text-sm font-medium"
								>
									{marker.displayName ?? marker.title}
								</span>
							</button>
							<Button
								variant="ghost"
								size="icon"
								class="size-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
								aria-label={t("map.deleteAria")}
								onclick={() => onDeleteMarker?.(marker)}
							>
								<TrashIcon class="size-4" />
							</Button>
						</div>
					{/each}
				{/if}

				{#if locations.length > 0}
					<div class="flex items-center justify-between pe-1">
						<p
							class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{t("map.sharedHeading")}
						</p>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-xs text-destructive hover:text-destructive"
							onclick={() => onDeleteAll?.("locations")}
						>
							{t("map.deleteAll")}
						</Button>
					</div>
					{#each locations as location (location.localId)}
						<div
							class="flex w-full items-center gap-1 rounded-2xl px-3 py-1.5 transition-colors hover:bg-muted/70"
						>
							<button
								type="button"
								class="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
								onclick={() => onPickLocation?.(location)}
							>
								<span
									class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
								>
									<MapPinIcon class="size-4" weight="fill" />
								</span>
								<span
									class="min-w-0 flex-1 truncate text-sm font-medium"
								>
									{locationLabel(location)}
								</span>
							</button>
							<Button
								variant="ghost"
								size="icon"
								class="size-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
								aria-label={t("map.deleteAria")}
								onclick={() => onDeleteLocation?.(location)}
							>
								<TrashIcon class="size-4" />
							</Button>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	{:else if overlays.mode === "SELECTED_MARKER" && selectedMarker}
		<SelectedMarkerCard
			{selectedMarker}
			onOpenProfile={openProfile}
			{onOpenDirections}
			onClose={() => overlays.clearSelection()}
			onDelete={() => onDeleteMarker?.(selectedMarker)}
		/>
	{/if}
</div>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{confirmTitle}</AlertDialog.Title>
			<AlertDialog.Description>
				{confirmBody}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg"
				>{t("common.cancel")}</AlertDialog.Cancel
			>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void onConfirmDelete()}
			>
				{t("common.delete")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
