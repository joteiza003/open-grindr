<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	type ViewMode = "grid" | "compact" | "detailed";

	let pending = $state<ViewMode | null>(null);
	const value = $derived(pending ?? preferencesSnapshot().browse.viewMode);

	function choose(next: string): void {
		const viewMode = (next || "grid") as ViewMode;
		if (viewMode === value) return;
		pending = viewMode;
		const browse = { ...preferencesSnapshot().browse, viewMode };
		setPreferences({ browse }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Card size</Item.Title>
		<Item.Description>
			Compact fits more people per screen; detailed shows larger cards.
		</Item.Description>
	</Item.Content>
	<ToggleGroup.Root
		type="single"
		variant="outline"
		class="w-full"
		disabled={!preferencesLoaded()}
		bind:value={() => value, choose}
	>
		<ToggleGroup.Item value="compact" class="flex-1 justify-center">
			Compact
		</ToggleGroup.Item>
		<ToggleGroup.Item value="grid" class="flex-1 justify-center">
			Standard
		</ToggleGroup.Item>
		<ToggleGroup.Item value="detailed" class="flex-1 justify-center">
			Detailed
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</Item.Root>
