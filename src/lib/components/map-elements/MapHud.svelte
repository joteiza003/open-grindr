<script lang="ts">
	import { CircleIcon, MapPinIcon, NavigationArrowIcon, TrashIcon, XIcon } from "phosphor-svelte";
	import { goto } from "$app/navigation";

	import CircleEditor from "$lib/components/map-elements/CircleEditor.svelte";
	import MarkerEditor from "$lib/components/map-elements/MarkerEditor.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import { t } from "$lib/i18n";
	import { currentLocale } from "$lib/i18n/t";
	import { formatDistanceKm } from "$lib/map/geographic";
	import type { MarkerCluster } from "$lib/map/cluster-markers";
	import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import type { MapCircle, MapMarker } from "$lib/model/map-elements";

	let {
		overlays,
		modeHint = null,
		empty = false,
		openCluster = $bindable(null),
		confirmOpen = $bindable(false),
		selectedMarker = null,
		listOpen = $bindable(false),
		userLocation = null,
		onPickMarker,
		onPickCircle,
		onConfirmDelete,
		onOpenProfile,
		onOpenDirections,
	}: {
		overlays: MapElementsState;
		modeHint?: string | null;
		empty?: boolean;
		openCluster: Extract<MarkerCluster, { type: "group" }> | null;
		confirmOpen: boolean;
		selectedMarker?: MapMarker | null;
		listOpen?: boolean;
		userLocation?: { latitude: number; longitude: number } | null;
		onPickMarker: (marker: MapMarker) => void;
		onPickCircle: (circle: MapCircle) => void;
		onConfirmDelete: () => void | Promise<void>;
		onOpenProfile?: (profileId: number) => void;
		onOpenDirections?: (marker: MapMarker) => void;
	} = $props();

	const locale = $derived(currentLocale());
	const listVisible = $derived(listOpen && overlays.mode === "NORMAL");
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
				aria-label={t("map.cancelAria")}
				onclick={() => overlays.cancelCreation()}
			>
				<XIcon class="size-4" />
			</Button>
		</div>
	</div>
{/if}

{#if empty}
	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-1000 flex justify-center px-4"
	>
		<div
			class="max-w-xl rounded-2xl border border-border bg-card/95 px-3 py-2 text-center shadow-xl"
		>
			<p class="text-sm text-muted-foreground">{t("map.empty")}</p>
		</div>
	</div>
{/if}

<div class="pointer-events-none absolute inset-x-0 bottom-4 z-1000 px-3">
	{#if overlays.mode === "CIRCLE_CONFIGURATION" && overlays.circleDraft}
		<CircleEditor
			draft={overlays.circleDraft}
			error={overlays.error}
			{userLocation}
			onchange={(patch) => overlays.updateCircleDraft(patch)}
			onmove={(lat, lon) => overlays.moveCircleDraft(lat, lon)}
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
					{t("map.markerCount", {
						count: openCluster.markers.length,
					})}
				</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("map.closeCluster")}
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
						{#if marker.mediaHash}
							<span class="size-8 shrink-0 overflow-hidden rounded-full">
								<UserAvatar mediaHash={marker.mediaHash} class="size-8" size="md" />
							</span>
						{:else}
							<MapPinIcon class="size-4 shrink-0" />
						{/if}
						<span class="truncate">{marker.displayName ?? marker.title}</span>
					</button>
				{/each}
			</div>
		</section>
	{:else if listVisible}
		<section
			class="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/95 p-3 shadow-2xl"
			aria-label={t("map.list")}
		>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-sm font-semibold">{t("map.list")}</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("common.close")}
					onclick={() => (listOpen = false)}
				>
					<XIcon class="size-4" />
				</Button>
			</div>
			<div class="max-h-56 space-y-2 overflow-auto">
				{#if overlays.circles.length === 0 && overlays.markers.length === 0}
					<p class="px-2 py-3 text-sm text-muted-foreground">
						{t("map.listEmpty")}
					</p>
				{/if}
				{#if overlays.circles.length > 0}
					<h3
						class="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
					>
						{t("map.circlesHeading")}
					</h3>
					{#each overlays.circles as circle (circle.id)}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted/60"
							onclick={() => onPickCircle(circle)}
						>
							<CircleIcon
								class="size-4 shrink-0"
								weight="fill"
								color={circle.color}
							/>
							<span class="min-w-0 flex-1 truncate">
								{circle.name ?? t("map.unnamedCircle")}
							</span>
							<span
								class="shrink-0 text-xs text-muted-foreground"
							>
								{formatDistanceKm(circle.radiusKm, locale)}
							</span>
						</button>
					{/each}
				{/if}
				{#if overlays.markers.length > 0}
					<h3
						class="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
					>
						{t("map.markersHeading")}
					</h3>
					{#each overlays.markers as marker (marker.id)}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted/60"
							onclick={() => onPickMarker(marker)}
						>
							{#if marker.mediaHash}
								<span class="size-8 shrink-0 overflow-hidden rounded-full">
									<UserAvatar mediaHash={marker.mediaHash} class="size-8" size="md" />
								</span>
							{:else}
								<MapPinIcon class="size-4 shrink-0" weight="fill" />
							{/if}
							<span class="truncate">{marker.displayName ?? marker.title}</span>
						</button>
					{/each}
				{/if}
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
			{#if selectedMarker.mediaHash || selectedMarker.profileId}
				<button
					type="button"
					class="size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-border"
					onclick={() => {
						if (selectedMarker.profileId) {
							(onOpenProfile ?? ((id: number) => void goto(`/profile/${id}`)))(
								selectedMarker.profileId,
							);
						}
					}}
				>
					<UserAvatar
						mediaHash={selectedMarker.mediaHash ?? null}
						class="size-12"
						size="md"
					/>
				</button>
			{:else}
				<MapPinIcon class="size-5 shrink-0" weight="fill" />
			{/if}
			<div class="min-w-0 flex-1">
				<h2 class="truncate text-sm font-semibold">
					{selectedMarker.displayName ?? selectedMarker.title}
				</h2>
				<p class="truncate text-xs text-muted-foreground">
					{selectedMarker.latitude.toFixed(4)}, {selectedMarker.longitude.toFixed(
						4,
					)}
				</p>
				<div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
					{#if selectedMarker.profileId}
						<button
							type="button"
							class="text-xs font-medium text-primary"
							onclick={() => {
								(onOpenProfile ?? ((id: number) => void goto(`/profile/${id}`)))(
									selectedMarker.profileId!,
								);
							}}
						>
							Ver perfil
						</button>
					{/if}
					<button
						type="button"
						class="text-xs font-medium text-primary"
						onclick={() => onOpenDirections?.(selectedMarker)}
					>
						Ruta en Maps
					</button>
				</div>
			</div>
			<Button
				variant="secondary"
				size="icon"
				aria-label="Ruta en Google Maps"
				title="Ruta en Google Maps"
				onclick={() => onOpenDirections?.(selectedMarker)}
			>
				<NavigationArrowIcon class="size-4" weight="fill" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => overlays.clearSelection()}
			>
				{t("common.close")}
			</Button>
			<Button
				variant="destructive"
				size="icon"
				aria-label={t("map.deleteAria")}
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
			<AlertDialog.Title>{t("map.deleteTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("map.deleteBody")}
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
