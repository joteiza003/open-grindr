<script lang="ts">
	import { MapPinIcon, TrashIcon, XIcon } from "phosphor-svelte";

	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { MapMarker } from "$lib/model/map-elements";
	import type { SavedLocation } from "$lib/model/messaging/saved-locations";

	let {
		markers,
		locations,
		locationLabel,
		onPickMarker,
		onPickLocation,
		onDeleteMarker,
		onDeleteLocation,
		onDeleteAll,
		onClose,
	}: {
		markers: MapMarker[];
		locations: SavedLocation[];
		locationLabel: (location: SavedLocation) => string;
		onPickMarker: (marker: MapMarker) => void;
		onPickLocation: (location: SavedLocation) => void;
		onDeleteMarker: (marker: MapMarker) => void;
		onDeleteLocation: (location: SavedLocation) => void;
		onDeleteAll: (kind: "pins" | "shared") => void;
		onClose: () => void;
	} = $props();

	const heading =
		"px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase";
	const row =
		"flex w-full items-center gap-1 rounded-2xl px-3 py-0.5 transition-colors hover:bg-muted/70";
	const rowButton =
		"flex min-w-0 flex-1 items-center gap-3 py-2 text-left active:opacity-70";
	const deleteButton =
		"size-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive";
</script>

{#snippet avatarOrPin(mediaHash: string | undefined)}
	{#if mediaHash}
		<span
			class="size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
		>
			<UserAvatar {mediaHash} class="size-9" size="md" />
		</span>
	{:else}
		<span
			class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
		>
			<MapPinIcon class="size-4" weight="fill" />
		</span>
	{/if}
{/snippet}

<section
	class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl"
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
			onclick={onClose}
		>
			<XIcon class="size-4" />
		</Button>
	</div>

	<div class="max-h-60 space-y-1 overflow-y-auto overscroll-contain p-2">
		{#if markers.length === 0 && locations.length === 0}
			<p class="px-3 py-6 text-center text-sm text-muted-foreground">
				{t("map.listEmpty")}
			</p>
		{/if}

		{#if markers.length > 0}
			<div class="flex items-center justify-between pe-1">
				<p class={heading}>{t("map.markersHeading")}</p>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 text-xs text-destructive hover:text-destructive"
					onclick={() => onDeleteAll("pins")}
				>
					{t("map.deleteAll")}
				</Button>
			</div>
			{#each markers as marker (marker.id)}
				<div class={row}>
					<button
						type="button"
						class={rowButton}
						onclick={() => onPickMarker(marker)}
					>
						{@render avatarOrPin(marker.mediaHash)}
						<span
							class="min-w-0 flex-1 truncate text-sm font-medium"
						>
							{marker.displayName ?? marker.title}
						</span>
					</button>
					<Button
						variant="ghost"
						size="icon"
						class={deleteButton}
						aria-label={t("map.deleteAria")}
						onclick={() => onDeleteMarker(marker)}
					>
						<TrashIcon class="size-4" />
					</Button>
				</div>
			{/each}
		{/if}

		{#if locations.length > 0}
			<div class="flex items-center justify-between pe-1">
				<p class={heading}>{t("map.sharedHeading")}</p>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 text-xs text-destructive hover:text-destructive"
					onclick={() => onDeleteAll("shared")}
				>
					{t("map.deleteAll")}
				</Button>
			</div>
			{#each locations as location (location.localId)}
				<div class={row}>
					<button
						type="button"
						class={rowButton}
						onclick={() => onPickLocation(location)}
					>
						{@render avatarOrPin(undefined)}
						<span
							class="min-w-0 flex-1 truncate text-sm font-medium"
						>
							{locationLabel(location)}
						</span>
					</button>
					<Button
						variant="ghost"
						size="icon"
						class={deleteButton}
						aria-label={t("map.deleteAria")}
						onclick={() => onDeleteLocation(location)}
					>
						<TrashIcon class="size-4" />
					</Button>
				</div>
			{/each}
		{/if}
	</div>
</section>
