<script lang="ts">
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import { preferencesLoaded } from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import { t } from "$lib/i18n";
	import {
		messageTranslations,
		translationSettings,
		translator,
		updateTranslationSettings,
	} from "$lib/translate/translation-state.svelte";
	import LanguageChips from "./LanguageChips.svelte";

	const settings = $derived(translationSettings());
	const ready = $derived(preferencesLoaded());

	let emailDraft = $state<string | null>(null);
	const email = $derived(emailDraft ?? settings.email);

	function save(patch: Parameters<typeof updateTranslationSettings>[0]) {
		updateTranslationSettings(patch).catch((error) =>
			showErrorToast({ label: "Failed to save preferences", error }),
		);
	}

	function commitEmail() {
		if (emailDraft === null) return;
		const value = emailDraft.trim();
		emailDraft = null;
		if (value !== settings.email) save({ email: value });
	}
</script>

<h1 class="truncate ps-4 text-xl font-semibold tracking-tight">
	{t("translate.title")}
</h1>
<p class="px-4 text-sm text-muted-foreground">{t("translate.intro")}</p>

<SwitchField
	title={t("translate.enable")}
	description={t("translate.enableDesc")}
	disabled={!ready}
	bind:checked={
		() => settings.enabled, (value: boolean) => save({ enabled: value })
	}
/>

{#if settings.enabled}
	<SwitchField
		title={t("translate.autoIncoming")}
		description={t("translate.autoIncomingDesc")}
		disabled={!ready}
		bind:checked={
			() => settings.autoIncoming,
			(value: boolean) => save({ autoIncoming: value })
		}
	/>

	<LanguageChips
		title={t("translate.myLanguage")}
		value={settings.myLanguage}
		disabled={!ready}
		onChoose={(code) => {
			save({ myLanguage: code });
			// Existing translations were made into the previous language.
			messageTranslations.clear();
		}}
	/>

	<LanguageChips
		title={t("translate.defaultPartner")}
		value={settings.defaultPartnerLanguage}
		disabled={!ready}
		onChoose={(code) => save({ defaultPartnerLanguage: code })}
	/>

	<div class="flex flex-col gap-2 rounded-xl border p-4">
		<Label for="translate-email">{t("translate.email")}</Label>
		<Input
			id="translate-email"
			type="email"
			inputmode="email"
			autocomplete="email"
			value={email}
			disabled={!ready}
			oninput={(event) =>
				(emailDraft = (event.currentTarget as HTMLInputElement).value)}
			onblur={commitEmail}
			onkeydown={(event) => {
				if (event.key === "Enter") commitEmail();
			}}
		/>
		<p class="text-sm text-muted-foreground">{t("translate.emailDesc")}</p>
	</div>

	<Button
		variant="ghost"
		class="self-start"
		onclick={() => {
			translator.clearCache();
			messageTranslations.clear();
			toast.success(t("translate.cleared"));
		}}
	>
		{t("translate.clearCache")}
	</Button>
{/if}
