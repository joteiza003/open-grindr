<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	type Density = "comfortable" | "compact";

	let pending = $state<Density | null>(null);
	const value = $derived(pending ?? preferencesSnapshot().appearance.density);

	function choose(next: string): void {
		const density = (next || "comfortable") as Density;
		if (density === value) return;
		pending = density;
		const appearance = { ...preferencesSnapshot().appearance, density };
		setPreferences({ appearance }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Density</Item.Title>
		<Item.Description
			>Tighten spacing to fit more on screen.</Item.Description
		>
	</Item.Content>
	<ToggleGroup.Root
		type="single"
		variant="outline"
		class="w-full"
		disabled={!preferencesLoaded()}
		bind:value={() => value, choose}
	>
		<ToggleGroup.Item value="comfortable" class="flex-1 justify-center">
			Comfortable
		</ToggleGroup.Item>
		<ToggleGroup.Item value="compact" class="flex-1 justify-center">
			Compact
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</Item.Root>
