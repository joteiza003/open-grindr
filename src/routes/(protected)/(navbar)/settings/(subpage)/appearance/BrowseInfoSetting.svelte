<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	type NameStyle = "solid" | "gradient" | "none";

	const browse = $derived(preferencesSnapshot().browse);

	function patch(next: Partial<typeof browse>): void {
		const updated = { ...preferencesSnapshot().browse, ...next };
		setPreferences({ browse: updated }).catch((error) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<SwitchField
	title="Show name"
	description="Display each person's name on their card."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showName, (showName: boolean) => patch({ showName })
	}
/>
<SwitchField
	title="Show distance"
	description="Display how far away each person is."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showDistance,
		(showDistance: boolean) => patch({ showDistance })
	}
/>
<SwitchField
	title="Show age"
	description="Display each person's age next to their name."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showAge, (showAge: boolean) => patch({ showAge })
	}
/>
<SwitchField
	title="Show online status"
	description="Display the online indicator on each card."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showOnlineStatus,
		(showOnlineStatus: boolean) => patch({ showOnlineStatus })
	}
/>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Name style</Item.Title>
		<Item.Description>How the name sits over the photo.</Item.Description>
	</Item.Content>
	<ToggleGroup.Root
		type="single"
		variant="outline"
		class="w-full"
		disabled={!preferencesLoaded() || !browse.showName}
		bind:value={
			() => browse.nameStyle,
			(next: string) =>
				patch({ nameStyle: (next || "solid") as NameStyle })
		}
	>
		<ToggleGroup.Item value="solid" class="flex-1 justify-center">
			Chip
		</ToggleGroup.Item>
		<ToggleGroup.Item value="gradient" class="flex-1 justify-center">
			Gradient
		</ToggleGroup.Item>
		<ToggleGroup.Item value="none" class="flex-1 justify-center">
			Minimal
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</Item.Root>
