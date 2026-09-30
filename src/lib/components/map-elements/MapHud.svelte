<script lang="ts">
	import { goto } from "$app/navigation";
	import { CircleIcon, MapPinIcon, XIcon } from "phosphor-svelte";

	import CircleEditor from "$lib/components/map-elements/CircleEditor.svelte";
	import MarkerEditor from "$lib/components/map-elements/MarkerEditor.svelte";
	import SelectedMarkerCard from "$lib/components/map-elements/SelectedMarkerCard.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import Button from "$lib/components/ui/button/button.svelte";
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

	function openProfile(id: number) {
		(onOpenProfile ?? ((pid: number) => void goto(`/profile/${pid}`)))(id);
	}
</script>

<!-- Mode hint (add circle / add marker) -->
{#if modeHint}
	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-1000 flex justify-center px-14"
	>
		<div
			class="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-border/80 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl"
		>
			<p class="flex-1 text-sm leading-snug font-medium">{modeHint}</p>
			<Button
				variant="ghost"
				size="icon"
				class="size-8 shrink-0 rounded-full"
				aria-label={t("map.cancelAria")}
				onclick={() => overlays.cancelCreation()}
			>
				<XIcon class="size-4" />
			</Button>
		</div>
	</div>
{/if}

<!-- Empty state -->
{#if empty}
	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-1000 flex justify-center px-4"
	>
		<div
			class="max-w-md rounded-2xl border border-border/80 bg-card/95 px-4 py-3 text-center shadow-xl backdrop-blur-xl"
		>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{t("map.empty")}
			</p>
		</div>
	</div>
{/if}

<!-- Bottom panels -->
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
		<!-- Cluster list -->
		<section
			class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl"
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
					class="size-8 rounded-full"
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
			class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl"
			aria-label={t("map.list")}
		>
			<div
				class="flex items-center justify-between border-b border-border/60 px-4 py-3"
			>
				<h2 class="text-sm font-semibold">{t("map.list")}</h2>
				<Button
					variant="ghost"
					size="icon"
					class="size-8 rounded-full"
					aria-label={t("common.close")}
					onclick={() => (listOpen = false)}
				>
					<XIcon class="size-4" />
				</Button>
			</div>

			<div
				class="max-h-60 space-y-1 overflow-y-auto overscroll-contain p-2"
			>
				{#if overlays.circles.length === 0 && overlays.markers.length === 0}
					<p
						class="px-3 py-6 text-center text-sm text-muted-foreground"
					>
						{t("map.listEmpty")}
					</p>
				{/if}

				{#if overlays.circles.length > 0}
					<p
						class="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
					>
						{t("map.circlesHeading")}
					</p>
					{#each overlays.circles as circle (circle.id)}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
							onclick={() => onPickCircle(circle)}
						>
							<span
								class="grid size-9 shrink-0 place-items-center rounded-full"
								style:background-color="{circle.color}22"
							>
								<CircleIcon
									class="size-4"
									weight="fill"
									color={circle.color}
								/>
							</span>
							<span
								class="min-w-0 flex-1 truncate text-sm font-medium"
							>
								{circle.name ?? t("map.unnamedCircle")}
							</span>
							<span
								class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums"
							>
								{formatDistanceKm(circle.radiusKm, locale)}
							</span>
						</button>
					{/each}
				{/if}

				{#if overlays.markers.length > 0}
					<p
						class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
					>
						{t("map.markersHeading")}
					</p>
					{#each overlays.markers as marker (marker.id)}
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
		<SelectedMarkerCard
			{selectedMarker}
			onOpenProfile={openProfile}
			{onOpenDirections}
			onClose={() => overlays.clearSelection()}
			onDelete={() => (confirmOpen = true)}
		/>
	{/if}
</div>

<!-- Delete confirmation -->
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
