<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import {
		discreetModeEnabled,
		setDiscreetMode,
	} from "$lib/chat/discreet-mode";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import { t } from "$lib/i18n";

	type Theme = "system" | "dark" | "light";
	const THEMES: Theme[] = ["system", "dark", "light"];

	const prefs = $derived(preferencesSnapshot());
	// Se enseña el valor nuevo al instante, sin esperar a que se guarde.
	let discreetPending = $state<boolean | null>(null);
	const discreet = $derived(discreetPending ?? discreetModeEnabled());

	const themeLabel: Record<Theme, () => string> = {
		system: () => t("quickSettings.themeSystem"),
		dark: () => t("quickSettings.themeDark"),
		light: () => t("quickSettings.themeLight"),
	};

	function save(values: Parameters<typeof setPreferences>[0]): void {
		setPreferences(values).catch((error: unknown) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}

	function setDiscreet(enabled: boolean): void {
		discreetPending = enabled;
		setDiscreetMode(enabled)
			.catch((error: unknown) =>
				showErrorToast({ label: "Failed to save preferences", error }),
			)
			.finally(() => (discreetPending = null));
	}
</script>

<section
	class="og-settings-group"
	data-slot="quick-settings"
	aria-label={t("quickSettings.title")}
>
	<h2 class="px-4 pt-3 text-sm font-semibold">{t("quickSettings.title")}</h2>
	<SwitchField
		title={t("quickSettings.invisible")}
		description={t("quickSettings.invisibleHint")}
		disabled={!preferencesLoaded()}
		bind:checked={
			() => !prefs.stayOnline,
			(invisible: boolean) => save({ stayOnline: !invisible })
		}
	/>
	<SwitchField
		title={t("navSettings.oneHand")}
		description={t("navSettings.oneHandHint")}
		disabled={!preferencesLoaded()}
		bind:checked={
			() => prefs.oneHandMode,
			(oneHandMode: boolean) => save({ oneHandMode })
		}
	/>
	<SwitchField
		title={t("discreet.title")}
		description={t("discreet.description")}
		disabled={!preferencesLoaded()}
		bind:checked={() => discreet, setDiscreet}
	/>
	<SwitchField
		title={t("quickSettings.reduceMotion")}
		description={t("quickSettings.reduceMotionHint")}
		disabled={!preferencesLoaded()}
		bind:checked={
			() => !prefs.appearance.animations,
			(reduce: boolean) =>
				save({
					appearance: { ...prefs.appearance, animations: !reduce },
				})
		}
	/>
	<div class="flex flex-col gap-2 px-4 pb-4">
		<span class="text-sm font-medium">{t("quickSettings.theme")}</span>
		<div
			role="radiogroup"
			aria-label={t("quickSettings.theme")}
			class="flex flex-wrap gap-1.5"
		>
			{#each THEMES as theme (theme)}
				<button
					type="button"
					role="radio"
					aria-checked={prefs.appearance.theme === theme}
					disabled={!preferencesLoaded()}
					class="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
					onclick={() =>
						save({ appearance: { ...prefs.appearance, theme } })}
				>
					{themeLabel[theme]()}
				</button>
			{/each}
		</div>
	</div>
</section>
