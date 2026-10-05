<script lang="ts">
	import VideoIcon from "phosphor-svelte/lib/VideoIcon";
	import type { Snippet } from "svelte";

	import SelectionOverlay from "$lib/components/shared/SelectionOverlay.svelte";

	let {
		video,
		selected,
		overlay,
		order = null,
	}: {
		video: boolean;
		selected: boolean;
		overlay?: Snippet;
		order?: number | null;
	} = $props();
</script>

{#if video}
	<div
		data-slot="media-tile-video-badge"
		class="absolute bottom-1.5 left-1.5 flex size-6 items-center justify-center media-chip backdrop-filter-(--bd-chip)"
	>
		<VideoIcon weight="fill" class="size-3.5" />
	</div>
{/if}
{#if selected}
	<SelectionOverlay {order} />
{:else}
	{@render overlay?.()}
{/if}
