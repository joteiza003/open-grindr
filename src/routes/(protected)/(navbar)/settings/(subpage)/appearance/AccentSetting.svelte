<script lang="ts">
	import { CheckIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { type AccentKey, accents } from "$lib/appearance/accents";
	import * as Item from "$lib/components/ui/item";

	let pending = $state<AccentKey | null>(null);
	const current = $derived(
		pending ?? preferencesSnapshot().appearance.accent,
	);

	function choose(accent: AccentKey): void {
		if (accent === current) return;
		pending = accent;
		const appearance = { ...preferencesSnapshot().appearance, accent };
		setPreferences({ appearance }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Accent color</Item.Title>
		<Item.Description>
			Used across buttons, highlights, and the active tab.
		</Item.Description>
	</Item.Content>
	<div
		class="flex w-full flex-wrap gap-3"
		role="radiogroup"
		aria-label="Accent color"
	>
		{#each accents as accent (accent.key)}
			<button
				type="button"
				role="radio"
				aria-checked={current === accent.key}
				aria-label={accent.label}
				title={accent.label}
				disabled={!preferencesLoaded()}
				class="grid size-9 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-transform disabled:opacity-50 aria-checked:ring-foreground can-hover:hover:scale-105"
				style:background-color={accent.swatch}
				onclick={() => choose(accent.key)}
			>
				{#if current === accent.key}
					<CheckIcon class="size-4 text-black/80" weight="bold" />
				{/if}
			</button>
		{/each}
	</div>
</Item.Root>
