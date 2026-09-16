<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";

	let pending = $state<boolean | null>(null);
	// The stored preference is `animations` (enabled); the control is framed as
	// "reduce motion", so it is the inverse.
	const reduce = $derived(
		pending ?? !preferencesSnapshot().appearance.animations,
	);

	function setReduce(nextReduce: boolean): void {
		pending = nextReduce;
		const appearance = {
			...preferencesSnapshot().appearance,
			animations: !nextReduce,
		};
		setPreferences({ appearance }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<SwitchField
	title="Reduce motion"
	description="Minimize animations and transitions across the app."
	disabled={!preferencesLoaded()}
	bind:checked={() => reduce, setReduce}
/>
