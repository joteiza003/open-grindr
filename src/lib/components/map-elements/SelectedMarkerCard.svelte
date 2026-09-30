<script lang="ts">
	import {
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
		onOpenProfile,
		onOpenDirections,
		onClose,
		onDelete,
	}: {
		selectedMarker: MapMarker;
		onOpenProfile: (profileId: number) => void;
		onOpenDirections?: (marker: MapMarker) => void;
		onClose: () => void;
		onDelete: () => void;
	} = $props();
</script>

<section
	class="pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-3 shadow-2xl backdrop-blur-xl"
>
	{#if selectedMarker.mediaHash || selectedMarker.profileId}
		<button
			type="button"
			class="size-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border transition-opacity active:opacity-80"
			onclick={() => {
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
		<p class="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
			{selectedMarker.latitude.toFixed(4)}, {selectedMarker.longitude.toFixed(
				4,
			)}
		</p>
		<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
			{#if selectedMarker.profileId}
				<button
					type="button"
					class="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity active:opacity-70"
					onclick={() => onOpenProfile(selectedMarker.profileId!)}
				>
					<UserIcon class="size-3.5" weight="bold" />
					{t("map.viewProfile")}
				</button>
			{/if}
			<button
				type="button"
				class="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity active:opacity-70"
				onclick={() => onOpenDirections?.(selectedMarker)}
			>
				<NavigationArrowIcon class="size-3.5" weight="fill" />
				{t("map.directions")}
			</button>
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-1">
		<Button
			variant="secondary"
			size="icon"
			class="size-9 rounded-xl"
			aria-label={t("map.directions")}
			title={t("map.directions")}
			onclick={() => onOpenDirections?.(selectedMarker)}
		>
			<NavigationArrowIcon class="size-4" weight="fill" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-9 rounded-xl"
			aria-label={t("common.close")}
			onclick={() => onClose()}
		>
			<XIcon class="size-4" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
			aria-label={t("map.deleteAria")}
			onclick={() => onDelete()}
		>
			<TrashIcon class="size-4" />
		</Button>
	</div>
</section>
