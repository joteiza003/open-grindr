<script lang="ts">
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { loadChatBackgroundUrl } from "$lib/appearance/chat-background";

	const background = $derived(preferencesSnapshot().chat.background);

	let photoUrl = $state<string | null>(null);

	// Load (and reload on replacement) the stored photo as an object URL, and
	// revoke it on cleanup so we never leak blob URLs.
	$effect(() => {
		if (background.kind !== "photo") {
			photoUrl = null;
			return;
		}
		// Re-run when the stored photo changes.
		void background.photoUpdatedAt;

		let url: string | null = null;
		let cancelled = false;
		void loadChatBackgroundUrl()
			.then((loaded) => {
				if (cancelled) {
					if (loaded) URL.revokeObjectURL(loaded);
					return;
				}
				url = loaded;
				photoUrl = loaded;
			})
			.catch((error: unknown) => console.error(error));

		return () => {
			cancelled = true;
			if (url) URL.revokeObjectURL(url);
			photoUrl = null;
		};
	});
</script>

{#if background.kind === "color"}
	<div
		class="pointer-events-none absolute inset-0 z-0"
		style:background-color={background.color}
	></div>
{:else if background.kind === "photo" && photoUrl}
	<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<div
			class="absolute inset-0 scale-110 bg-cover bg-center"
			style:background-image="url({photoUrl})"
			style:filter="blur({background.blur}px)"
		></div>
		<div
			class="absolute inset-0"
			style:background-color="rgb(0 0 0 / {background.dim})"
		></div>
	</div>
{/if}
