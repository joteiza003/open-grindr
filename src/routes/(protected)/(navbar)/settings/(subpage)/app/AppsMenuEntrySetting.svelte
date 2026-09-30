<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import {
		desktopEntryInstalled,
		setDesktopEntryInstalled,
	} from "$lib/platform/desktop-entry.svelte";

	let pending = $state<boolean | null>(null);
	const value = $derived(pending ?? desktopEntryInstalled());
</script>

<SwitchField
	title="Show in apps menu"
	description="Add Euskal Grindr to your applications list so it appears in your launcher and gets its icon."
	bind:checked={
		() => value,
		(newValue: boolean) => {
			pending = newValue;
			setDesktopEntryInstalled(newValue)
				.catch((error: unknown) => {
					showErrorToast({
						label: newValue
							? "Couldn't add Euskal Grindr to your apps"
							: "Couldn't remove Euskal Grindr from your apps",
						error,
					});
				})
				.finally(() => (pending = null));
		}
	}
/>
