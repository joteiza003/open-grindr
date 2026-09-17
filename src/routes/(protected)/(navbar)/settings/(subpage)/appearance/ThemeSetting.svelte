<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import { t } from "$lib/i18n";

	type Theme = "system" | "dark" | "light";
	const themes: Theme[] = ["dark", "light", "system"];

	let pending = $state<Theme | null>(null);
	const current = $derived(pending ?? preferencesSnapshot().appearance.theme);

	function choose(theme: Theme): void {
		if (theme === current) return;
		pending = theme;
		const appearance = { ...preferencesSnapshot().appearance, theme };
		setPreferences({ appearance }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>{t("appearance.theme")}</Item.Title>
		<Item.Description>{t("appearance.themeHint")}</Item.Description>
	</Item.Content>
	<div
		class="flex flex-wrap gap-2"
		role="radiogroup"
		aria-label={t("appearance.theme")}
	>
		{#each themes as theme (theme)}
			<button
				type="button"
				role="radio"
				aria-checked={current === theme}
				disabled={!preferencesLoaded()}
				class="rounded-full border border-border px-3 py-1.5 text-sm aria-checked:border-foreground aria-checked:bg-muted"
				onclick={() => choose(theme)}
			>
				{theme === "dark"
					? t("appearance.themeDark")
					: theme === "light"
						? t("appearance.themeLight")
						: t("appearance.themeSystem")}
			</button>
		{/each}
	</div>
</Item.Root>
