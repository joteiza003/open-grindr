<script lang="ts">
	import { onMount } from "svelte";

	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { openProfilePreview } from "$lib/components/profile/profile-preview-state.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import { onlineFavorites } from "$lib/grid/favorites-online";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { t } from "$lib/i18n";

	// La franja se actualiza sola cuando alguien deja de estar en línea.
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const enabled = $derived(preferencesSnapshot().browse.showFavoritesStrip);
	const favorites = $derived(onlineFavorites(gridState.profiles, now));
</script>

{#if enabled && favorites.length > 0}
	<section
		data-slot="favorites-online"
		aria-label={t("favoritesStrip.title")}
		class="flex flex-col gap-1.5"
	>
		<h2 class="px-1 text-xs font-semibold text-muted-foreground">
			{t("favoritesStrip.title")}
		</h2>
		<ul
			data-scroll-intent="x"
			class="scrollbar-thin flex gap-3 overflow-x-auto px-1 pb-1"
		>
			{#each favorites as profile (profile.id)}
				<li class="shrink-0">
					<button
						type="button"
						class="flex w-14 flex-col items-center gap-1"
						aria-label={profile.displayName ??
							t("search.unknownChat")}
						onclick={() =>
							openProfilePreview(profile.id, {
								displayName: profile.displayName,
								age: profile.age ?? null,
								distance: profile.distance,
								mediaHash:
									profile.profilePhotosHashes?.[0] ?? null,
							})}
					>
						<span
							class="relative size-14 overflow-hidden rounded-full ring-2 ring-emerald-400"
						>
							<UserAvatar
								mediaHash={profile.profilePhotosHashes?.[0] ??
									null}
								class="size-14"
								size="md"
							/>
						</span>
						<span class="w-full truncate text-center text-3xs">
							{profile.displayName ?? ""}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
