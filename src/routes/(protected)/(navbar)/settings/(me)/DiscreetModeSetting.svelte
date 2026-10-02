<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import { preferencesLoaded } from "$lib/app-data/preferences.svelte";
	import {
		discreetModeEnabled,
		setDiscreetMode,
	} from "$lib/chat/discreet-mode";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import { t } from "$lib/i18n";

	let pending = $state<boolean | null>(null);
	const value = $derived(pending ?? discreetModeEnabled());
</script>

<div class="og-settings-group">
	<SwitchField
		title={t("discreet.title")}
		description={t("discreet.description")}
		disabled={!preferencesLoaded()}
		bind:checked={
			() => value,
			(enabled: boolean) => {
				pending = enabled;
				setDiscreetMode(enabled)
					.catch((error: unknown) =>
						showErrorToast({
							label: "Failed to save preferences",
							error,
						}),
					)
					.finally(() => (pending = null));
			}
		}
	/>
</div>
