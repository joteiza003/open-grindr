<script lang="ts">
	import {
		hydratePreferences,
		preferencesSnapshot,
	} from "$lib/app-data/preferences.svelte";
	import TinderDeck from "$lib/components/carrousel/TinderDeck.svelte";
	import { t } from "$lib/i18n";
	import LocationChooser from "../(root)/LocationEmpty.svelte";

	const preferencesHydrated = hydratePreferences();
	const geohash = $derived(preferencesSnapshot().geohash);
</script>

<svelte:head>
	<title>{t("nav.carrousel")}</title>
</svelte:head>
{#await preferencesHydrated then}
	{#if geohash === null}
		<main class="m-auto flex max-w-full flex-1">
			<LocationChooser />
		</main>
	{:else}
		<main class="screen-nav-host">
			<TinderDeck {geohash} />
		</main>
	{/if}
{/await}
