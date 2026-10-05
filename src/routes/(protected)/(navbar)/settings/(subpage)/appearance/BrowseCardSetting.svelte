<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import { Slider } from "$lib/components/ui/slider";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import { t } from "$lib/i18n";

	// Defaults that reproduce the built-in grid look, used when the user first
	// opts into customizing.
	const DEFAULT_RADIUS = 17;
	const DEFAULT_GAP = 2;

	const browse = $derived(preferencesSnapshot().browse);
	const custom = $derived(
		browse.cardRadius !== null || browse.cardGap !== null,
	);

	function patch(next: Partial<typeof browse>): void {
		const updated = { ...preferencesSnapshot().browse, ...next };
		setPreferences({ browse: updated }).catch((error) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}

	const DEFAULT_COLUMNS = 3;

	function setCustomColumns(on: boolean): void {
		patch({ gridColumns: on ? DEFAULT_COLUMNS : null });
	}

	function setCustom(on: boolean): void {
		if (on) patch({ cardRadius: DEFAULT_RADIUS, cardGap: DEFAULT_GAP });
		else patch({ cardRadius: null, cardGap: null });
	}
</script>

<SwitchField
	title={t("gridColumns.title")}
	description={t("gridColumns.hint")}
	disabled={!preferencesLoaded()}
	bind:checked={() => browse.gridColumns !== null, setCustomColumns}
/>

{#if browse.gridColumns !== null}
	<Item.Root variant="outline" class="gap-3 p-4" data-slot="grid-columns">
		<Item.Content class="gap-1">
			<Item.Title>
				{t("gridColumns.value", { n: browse.gridColumns })}
			</Item.Title>
		</Item.Content>
		<Slider
			type="single"
			class="w-full"
			min={2}
			max={5}
			step={1}
			disabled={!preferencesLoaded()}
			thumbLabels={[t("gridColumns.title")]}
			bind:value={
				() => browse.gridColumns ?? DEFAULT_COLUMNS,
				(gridColumns: number) => patch({ gridColumns })
			}
		/>
	</Item.Root>
{/if}

<SwitchField
	title="Custom corners & spacing"
	description="Fine-tune the card corner radius and the gap between cards."
	disabled={!preferencesLoaded()}
	bind:checked={() => custom, setCustom}
/>

{#if custom}
	<Item.Root variant="outline" class="gap-3 p-4">
		<Item.Content class="gap-1">
			<Item.Title>Corner radius</Item.Title>
		</Item.Content>
		<Slider
			type="single"
			class="w-full"
			min={0}
			max={40}
			step={1}
			disabled={!preferencesLoaded()}
			thumbLabels={["Corner radius"]}
			bind:value={
				() => browse.cardRadius ?? DEFAULT_RADIUS,
				(cardRadius: number) => patch({ cardRadius })
			}
		/>
	</Item.Root>

	<Item.Root variant="outline" class="gap-3 p-4">
		<Item.Content class="gap-1">
			<Item.Title>Gap between cards</Item.Title>
		</Item.Content>
		<Slider
			type="single"
			class="w-full"
			min={0}
			max={24}
			step={1}
			disabled={!preferencesLoaded()}
			thumbLabels={["Gap between cards"]}
			bind:value={
				() => browse.cardGap ?? DEFAULT_GAP,
				(cardGap: number) => patch({ cardGap })
			}
		/>
	</Item.Root>
{/if}
