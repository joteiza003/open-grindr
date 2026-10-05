<script lang="ts">
	import { getAlbumStorageLimits } from "$lib/api/messaging/albums";
	import { t } from "$lib/i18n";

	let {
		count,
		maxAlbums = null,
		class: className,
	}: {
		count: number;
		/** Si la pantalla ya conoce el límite, se pasa aquí y no se vuelve a pedir. */
		maxAlbums?: number | null;
		class?: string;
	} = $props();

	let fetched = $state<number | null>(null);
	const max = $derived(maxAlbums ?? fetched);

	$effect(() => {
		if (maxAlbums !== null) return;
		void Promise.resolve(getAlbumStorageLimits())
			.then((limits) => {
				fetched = limits?.maxAlbums ?? null;
			})
			.catch((error: unknown) => console.error(error));
	});
</script>

{#if max !== null}
	<p
		data-slot="album-limits"
		class={["text-xs text-muted-foreground", className]}
	>
		{t("albumsKit.limits", { albums: count, maxAlbums: max })}
	</p>
{/if}
