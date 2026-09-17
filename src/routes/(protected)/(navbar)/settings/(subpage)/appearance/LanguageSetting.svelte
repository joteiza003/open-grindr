<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import { type Locale, LOCALE_LABELS, LOCALES, t } from "$lib/i18n";

	let pending = $state<Locale | null>(null);
	const current = $derived(pending ?? preferencesSnapshot().locale);

	function choose(locale: Locale): void {
		if (locale === current) return;
		pending = locale;
		setPreferences({ locale }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>{t("language.title")}</Item.Title>
		<Item.Description>{t("language.hint")}</Item.Description>
	</Item.Content>
	<div
		class="flex w-full flex-wrap gap-2"
		role="radiogroup"
		aria-label={t("language.title")}
	>
		{#each LOCALES as locale (locale)}
			<button
				type="button"
				role="radio"
				aria-checked={current === locale}
				disabled={!preferencesLoaded()}
				class="rounded-full border border-border px-3 py-1.5 text-sm aria-checked:border-foreground aria-checked:bg-muted"
				onclick={() => choose(locale)}
			>
				{LOCALE_LABELS[locale]}
			</button>
		{/each}
	</div>
</Item.Root>
