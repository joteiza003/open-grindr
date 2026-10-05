<script lang="ts">
	import { EyeIcon, EyeSlashIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";

	// `stayOnline` apagado = modo invisible: la app deja de mantenerte en línea
	// en segundo plano y solo se te ve mientras exploras la cuadrícula.
	const invisible = $derived(!preferencesSnapshot().stayOnline);

	function toggle() {
		const next = !preferencesSnapshot().stayOnline;
		setPreferences({ stayOnline: next })
			.then(() => {
				toast.message(
					next ? t("presence.visibleOn") : t("presence.invisibleOn"),
				);
			})
			.catch((error: unknown) => {
				showErrorToast({ label: t("presence.failed"), error });
			});
	}
</script>

<Button
	variant={invisible ? "default" : "secondary"}
	size="icon"
	data-slot="presence-toggle"
	aria-pressed={invisible}
	aria-label={t("presence.label")}
	title={invisible
		? t("presence.invisibleTitle")
		: t("presence.visibleTitle")}
	disabled={!preferencesLoaded()}
	onclick={toggle}
>
	{#if invisible}
		<EyeSlashIcon weight="fill" />
	{:else}
		<EyeIcon />
	{/if}
</Button>
