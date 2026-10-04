<script lang="ts">
	import {
		ArrowsClockwiseIcon,
		MapPinIcon,
		NavigationArrowIcon,
		TrashIcon,
		UserIcon,
		XIcon,
	} from "phosphor-svelte";

	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { MapMarker } from "$lib/model/map-elements";

	let {
		selectedMarker,
		refreshing = false,
		onOpenProfile,
		onOpenDirections,
		onRefresh,
		onClose,
		onDelete,
	}: {
		selectedMarker: MapMarker;
		refreshing?: boolean;
		onOpenProfile: (profileId: number) => void;
		onOpenDirections?: (marker: MapMarker) => void;
		onRefresh?: (marker: MapMarker) => void;
		onClose: () => void;
		onDelete: () => void;
	} = $props();

	const canRefresh = $derived(
		typeof selectedMarker.profileId === "number" &&
			selectedMarker.profileId > 0,
	);
</script>

<div
	class="pointer-events-auto relative z-[2000] mx-auto flex w-full max-w-xl flex-col gap-3 overflow-hidden rounded-3xl border border-border/80 bg-card p-3 shadow-2xl"
	role="dialog"
	aria-label={selectedMarker.displayName ?? selectedMarker.title}
>
	<div class="flex items-center gap-3">
		{#if selectedMarker.mediaHash || selectedMarker.profileId}
			<button
				type="button"
				class="size-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border transition-opacity active:opacity-80"
				onclick={(e) => {
					e.stopPropagation();
					if (selectedMarker.profileId) {
						onOpenProfile(selectedMarker.profileId);
					}
				}}
			>
				<UserAvatar
					mediaHash={selectedMarker.mediaHash ?? null}
					class="size-14"
					size="md"
				/>
			</button>
		{:else}
			<span
				class="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
			>
				<MapPinIcon class="size-6" weight="fill" />
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<h2 class="truncate text-sm leading-tight font-semibold">
				{selectedMarker.displayName ?? selectedMarker.title}
			</h2>
			<p
				class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums"
			>
				{selectedMarker.latitude.toFixed(5)}, {selectedMarker.longitude.toFixed(
					5,
				)}
			</p>
		</div>

		<Button
			variant="ghost"
			size="icon"
			class="size-9 shrink-0 rounded-xl"
			aria-label={t("common.close")}
			onclick={(e) => {
				e.stopPropagation();
				onClose();
			}}
		>
			<XIcon class="size-4" />
		</Button>
	</div>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		{#if selectedMarker.profileId}
			<Button
				variant="secondary"
				size="sm"
				class="h-10 gap-1.5 rounded-xl"
				onclick={(e) => {
					e.stopPropagation();
					onOpenProfile(selectedMarker.profileId!);
				}}
			>
				<UserIcon class="size-4" weight="bold" />
				<span class="truncate text-xs">{t("map.viewProfile")}</span>
			</Button>
		{/if}

		<Button
			variant="secondary"
			size="sm"
			class="h-10 gap-1.5 rounded-xl"
			onclick={(e) => {
				e.stopPropagation();
				onOpenDirections?.(selectedMarker);
			}}
		>
			<NavigationArrowIcon class="size-4" weight="fill" />
			<span class="truncate text-xs">{t("map.directions")}</span>
		</Button>

		{#if canRefresh}
			<Button
				variant="secondary"
				size="sm"
				class="h-10 gap-1.5 rounded-xl"
				disabled={refreshing}
				onclick={(e) => {
					e.stopPropagation();
					onRefresh?.(selectedMarker);
				}}
			>
				<ArrowsClockwiseIcon
					class="size-4 {refreshing ? 'animate-spin' : ''}"
					weight="bold"
				/>
				<span class="truncate text-xs">Actualizar</span>
			</Button>
		{/if}

		<Button
			variant="ghost"
			size="sm"
			class="h-10 gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
			onclick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
		>
			<TrashIcon class="size-4" />
			<span class="truncate text-xs">{t("common.delete")}</span>
		</Button>
	</div>
</div>
