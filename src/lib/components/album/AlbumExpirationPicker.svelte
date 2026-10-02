<script lang="ts">
	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { t } from "$lib/i18n";
	import {
		ALBUM_EXPIRATION_OPTIONS,
		type AlbumExpirationType,
	} from "$lib/model/messaging/albums";

	let { class: className }: { class?: import("svelte/elements").ClassValue } =
		$props();

	const chat = $derived(preferencesSnapshot().chat);
	const value = $derived(chat.albumExpiration);

	async function choose(next: AlbumExpirationType): Promise<void> {
		if (next === value) return;
		try {
			await setPreferences({ chat: { ...chat, albumExpiration: next } });
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div class={["flex flex-col gap-1.5", className]}>
	<span class="text-xs font-medium text-muted-foreground">
		{t("albums.expiry.label")}
	</span>
	<div
		role="radiogroup"
		aria-label={t("albums.expiry.label")}
		data-scroll-intent="x"
		class="scrollbar-thin flex items-center gap-1.5 overflow-x-auto"
	>
		{#each ALBUM_EXPIRATION_OPTIONS as option (option)}
			<button
				type="button"
				role="radio"
				aria-checked={option === value}
				class="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
				onclick={() => void choose(option)}
			>
				{t(`albums.expiry.${option}`)}
			</button>
		{/each}
	</div>
	<span class="text-xs text-muted-foreground">
		{t("albums.expiry.hint")}
	</span>
</div>
