<script lang="ts">
	import MediaImage from "$lib/components/shared/MediaImage.svelte";
	import SelectionOverlay from "$lib/components/shared/SelectionOverlay.svelte";
	import { proxyMediaUrl } from "$lib/util/media";
	import type { DrawerMedia } from "$lib/api/messaging/drawer";

	let {
		item,
		index,
		selected,
		onclick,
	}: {
		item: DrawerMedia;
		index: number;
		selected: boolean;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	data-slot="media-tile"
	class="relative aspect-(--photo-grid-aspect) cursor-pointer"
	aria-pressed={selected}
	{onclick}
>
	<MediaImage
		src={proxyMediaUrl(item.url)}
		alt="Photo {index + 1}"
		class="size-full rounded-[inherit]"
		imgClass="bg-card-foreground/10"
	/>
	{#if selected}
		<SelectionOverlay />
	{/if}
</button>
