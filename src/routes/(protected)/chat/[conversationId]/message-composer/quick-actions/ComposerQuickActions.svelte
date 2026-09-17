<script lang="ts">
	import FrequentPhrasesMenu from "./FrequentPhrasesMenu.svelte";
	import LocationConfirmDialog from "./LocationConfirmDialog.svelte";
	import PhotoAlbumsSheet from "./PhotoAlbumsSheet.svelte";

	let {
		conversationId,
		disabled = false,
	}: { conversationId: string; disabled?: boolean } = $props();

	let phrasesOpen = $state(false);
	let albumsOpen = $state(false);
	let locationOpen = $state(false);
</script>

<div
	class="flex shrink-0 items-center gap-0.5 pb-px"
	data-slot="composer-quick-actions"
>
	<FrequentPhrasesMenu {disabled} bind:open={phrasesOpen} />
	<PhotoAlbumsSheet {conversationId} {disabled} bind:open={albumsOpen} />
	<LocationConfirmDialog {disabled} bind:open={locationOpen} />
</div>
