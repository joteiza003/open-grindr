<script lang="ts">
	import { CheckIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { type LookKey, lookPreset, looks } from "$lib/appearance/looks";
	import * as Item from "$lib/components/ui/item";

	/**
	 * Looks de fábrica (design/04-implementacion.md §3): elegir uno aplica su
	 * paquete de tema + acento + densidad y deja que la hoja de estilos ponga
	 * el material por `data-look`. Nada de esto es texto traducible: son
	 * nombres propios, como los de `accents.ts`, y la i18n no añade claves
	 * (§4.5), así que la fila se rotula con los propios nombres.
	 */
	const groupLabel = looks.map((look) => look.label).join(" · ");

	let pending = $state<LookKey | null>(null);
	const current = $derived(pending ?? preferencesSnapshot().appearance.look);

	function choose(look: LookKey): void {
		if (look === current) return;
		pending = look;
		const { theme, accent, density } = lookPreset(look);
		const appearance = {
			...preferencesSnapshot().appearance,
			look,
			theme,
			accent,
			density,
		};
		setPreferences({ appearance }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<div
		class="grid w-full grid-cols-2 gap-2"
		role="radiogroup"
		aria-label={groupLabel}
	>
		{#each looks as look (look.key)}
			<button
				type="button"
				role="radio"
				aria-checked={current === look.key}
				title={look.label}
				disabled={!preferencesLoaded()}
				class="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left text-sm font-medium transition-colors aria-checked:border-foreground aria-checked:bg-muted disabled:opacity-50"
				onclick={() => choose(look.key)}
			>
				<span
					class="grid size-5 shrink-0 place-items-center rounded-xs ring-1 ring-(--border-subtle)"
					style:background-color={look.surfaceSwatch}
					aria-hidden="true"
				>
					<span
						class="size-2 rounded-full"
						style:background-color={look.accentSwatch}
					></span>
				</span>
				{look.label}
				{#if current === look.key}
					<CheckIcon class="ms-auto size-3.5" weight="bold" />
				{/if}
			</button>
		{/each}
	</div>
</Item.Root>
