<script lang="ts">
	import { MapPinIcon, XIcon } from "phosphor-svelte";

	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import type { MapMarker } from "$lib/model/map-elements";

	let {
		markers,
		isOnline,
		onPick,
		onClose,
	}: {
		markers: MapMarker[];
		/** Whether the profile behind a pin is online right now. */
		isOnline: (marker: MapMarker) => boolean;
		onPick: (marker: MapMarker) => void;
		onClose: () => void;
	} = $props();

	const title = $derived(t("map.markerCount", { count: markers.length }));
</script>

<section
	class="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl"
	aria-label={title}
>
	<div
		class="flex items-center justify-between border-b border-border/60 px-4 py-3"
	>
		<h2 class="text-sm font-semibold">{title}</h2>
		<Button
			variant="ghost"
			size="icon"
			class="size-8 rounded-full text-foreground"
			aria-label={t("map.closeCluster")}
			onclick={onClose}
		>
			<XIcon class="size-4" />
		</Button>
	</div>
	<div class="max-h-52 overflow-y-auto overscroll-contain p-2">
		{#each markers as marker (marker.id)}
			<button
				type="button"
				class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
				onclick={() => onPick(marker)}
			>
				{#if marker.mediaHash}
					<span
						class={[
							"size-9 shrink-0 overflow-hidden rounded-full",
							{
								"ring-2 ring-green-500": isOnline(marker),
								"ring-1 ring-border": !isOnline(marker),
							},
						]}
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
				<span class="min-w-0 flex-1 truncate text-sm font-medium">
					{marker.displayName ?? marker.title}
				</span>
			</button>
		{/each}
	</div>
</section>
